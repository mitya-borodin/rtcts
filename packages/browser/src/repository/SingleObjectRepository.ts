import { Entity, Response, wsEventEnum, ValidationResult } from "@rtcts/isomorphic";
import { getErrorMessage, isObject } from "@rtcts/utils";
import EventEmitter from "eventemitter3";
import { action, observable, runInAction } from "mobx";
import { repositoryPubSubEnum } from "../enums/repositoryPubSubEnum";
import { SingleObjectHttpTransport } from "../transport/http/SingleObjectHttpTransport";
import { WSClient } from "../transport/ws/WSClient";

export class SingleObjectRepository<
  HTTP_TRANSPORT extends SingleObjectHttpTransport<ENTITY, WS, PUB_SUB>,
  ENTITY extends Entity,
  WS extends WSClient = WSClient,
  PUB_SUB extends EventEmitter = EventEmitter
> extends EventEmitter {
  public static events = {
    init: `SingleObjectRepository.init`,
    update: `SingleObjectRepository.update`,
    destroy: `SingleObjectRepository.destroy`,
  };

  @observable
  public pending: boolean;

  @observable
  public entity: ENTITY | undefined;

  @observable
  public validationResult: ValidationResult;

  protected Entity: new (data: any) => ENTITY;
  protected httpTransport: HTTP_TRANSPORT;
  protected ws: WS;
  protected channelName: string;
  protected pubSub: PUB_SUB;

  protected isInit: boolean;

  constructor(
    Entity: new (data: any) => ENTITY,
    httpTransport: HTTP_TRANSPORT,
    ws: WS,
    channelName: string,
    pubSub: PUB_SUB,
  ) {
    super();

    // * DEPS
    this.Entity = Entity;
    this.httpTransport = httpTransport;
    this.ws = ws;
    this.channelName = channelName;
    this.pubSub = pubSub;

    // * INIT
    this.isInit = false;

    // ! OBSERVABLE
    this.pending = false;
    this.validationResult = new ValidationResult([]);

    // * BINDINGS
    this.init = this.init.bind(this);
    this.update = this.update.bind(this);
    this.receiveMessage = this.receiveMessage.bind(this);
    this.destroy = this.destroy.bind(this);
    this.handleUserBindedToConnection = this.handleUserBindedToConnection.bind(this);
    this.handleUserUnBindedToConnection = this.handleUserUnBindedToConnection.bind(this);

    // ! SUBSCRIPTIONS
    this.ws.on(wsEventEnum.USER_BIND_TO_CONNECTION, this.handleUserBindedToConnection);
    this.ws.on(wsEventEnum.USER_UNBIND_FROM_CONNECTION, this.handleUserUnBindedToConnection);
  }

  @action("SingleObjectRepository.init")
  public async init(): Promise<void> {
    if (this.isInit) {
      return;
    }

    try {
      if (!this.httpTransport.ACL.getItem.includes(this.httpTransport.currentUserGroup)) {
        throw new Error(`access denied for (${this.httpTransport.currentUserGroup})`);
      }

      this.start();

      const response: Response<ENTITY> | void = await this.httpTransport.getItem();

      if (!response) {
        throw new Error(`response is empty`);
      }

      this.validationResult = new ValidationResult(response.validationResult);

      runInAction(`Initialization (${this.constructor.name}) has been succeed`, () => {
        if (!response.payload) {
          throw new Error(`response.payload is empty`);
        }

        this.entity = response.payload;
        this.isInit = true;

        this.entityDidInit();

        this.emit(SingleObjectRepository.events.init, this.entity);

        this.pubSub.emit(repositoryPubSubEnum.init, this);
      });
    } catch (error) {
      console.error(
        `Initialization (${this.constructor.name}) has been failed: ${getErrorMessage(error)}`,
      );
    } finally {
      this.stop();
    }
  }

  @action("SingleObjectRepository.update")
  public async update(data: object): Promise<ENTITY | void> {
    try {
      if (!this.isInit) {
        throw new Error(`doesn't initialized yet`);
      }

      if (!this.httpTransport.ACL.update.includes(this.httpTransport.currentUserGroup)) {
        throw new Error(`access denied for (${this.httpTransport.currentUserGroup})`);
      }

      this.start();

      const response: Response<ENTITY> | void = await this.httpTransport.update(data);

      if (!response) {
        throw new Error(`response is empty`);
      }

      this.validationResult = new ValidationResult(response.validationResult);

      runInAction(`Update (${this.constructor.name}) has been succeed`, () => {
        if (!response.payload) {
          throw new Error(`response.payload is empty`);
        }

        this.entity = response.payload;
      });

      this.entityDidUpdate();

      this.emit(SingleObjectRepository.events.update, this.entity);

      return this.entity;
    } catch (error) {
      console.error(`Update (${this.constructor.name}) has been failed: ${getErrorMessage(error)}`);
    } finally {
      this.stop();
    }
  }

  @action("SingleObjectRepository.receiveMessage")
  public receiveMessage([channelName, payload]: [string, any]): ENTITY | ENTITY[] | void {
    if (this.isInit) {
      try {
        if (this.channelName === channelName) {
          console.log(
            `%cReceived a message on the channel (${channelName}) (${this.constructor.name})`,
            "color: #1890ff;",
            payload,
          );

          if (isObject(payload.create)) {
            this.entity = new this.Entity(payload.create);
          }

          if (isObject(payload.update)) {
            this.entity = new this.Entity(payload.update);
          }

          if (isObject(payload.create) || isObject(payload.update)) {
            this.entityDidUpdate();

            this.emit(SingleObjectRepository.events.update, this.entity);

            return this.entity;
          }

          throw new Error("unknown type of payload");
        }
      } catch (error) {
        console.error(
          `Received a message on the channel ` +
            `(${channelName}) ` +
            `(${this.constructor.name}) ` +
            `failed: ${getErrorMessage(error)}`,
        );
      }
    }
  }

  protected start(): void {
    runInAction(`Start pending for (${this.constructor.name})`, () => (this.pending = true));
  }

  protected stop(): void {
    runInAction(`Stop pending for (${this.constructor.name})`, () => (this.pending = false));
  }

  protected destroy(): void {
    runInAction(`${this.constructor.name} was destroyed`, () => {
      this.isInit = false;
      this.pending = false;
      this.entity = undefined;
    });
  }

  protected entityDidInit(): void {
    // ! HOOK FOR ENTITY INIT
  }

  protected entityDidUpdate(): void {
    // ! HOOK FOR ENTITY UPDATE
  }

  private async handleUserBindedToConnection(): Promise<void> {
    try {
      await this.httpTransport.subscribeToChannel();

      this.ws.on(wsEventEnum.MESSAGE_RECEIVE, this.receiveMessage);

      console.info(`The user is linked to the connection successfully (${this.constructor.name})`);
    } catch (error) {
      console.error(
        `The user is linked to the connection failed (${this.constructor.name}): ${getErrorMessage(
          error,
        )}`,
      );
    }
  }

  private handleUserUnBindedToConnection(): void {
    try {
      this.ws.off(wsEventEnum.MESSAGE_RECEIVE, this.receiveMessage);

      this.destroy();

      console.info(
        `The user is unlinked to the connection successfully (${this.constructor.name})`,
      );
    } catch (error) {
      console.error(
        `The user is unlinked to the connection failed (${
          this.constructor.name
        }): ${getErrorMessage(error)}`,
      );
    }
  }
}

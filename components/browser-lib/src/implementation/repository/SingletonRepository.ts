import { IEntity, wsEventEnum } from "@borodindmitriy/interfaces";
import { EventEmitter, Mediator } from "@borodindmitriy/isomorphic";
import { getErrorMessage, isObject } from "@borodindmitriy/utils";
import { action, observable, runInAction } from "mobx";
import { mediatorChannelEnum } from "../../enums/mediatorChannelEnum";
import { ISingletonRepository } from "../../interfaces/repository/ISingletonRepository";
import { ISingletonHTTPTransport } from "../../interfaces/transport/http/ISingletonHTTPTransport";
import { IWSClient } from "../../interfaces/transport/ws/IWSClient";

// tslint:disable: object-literal-sort-keys

export class SingletonRepository<
  E extends IEntity,
  T extends ISingletonHTTPTransport<E>,
  WS extends IWSClient = IWSClient,
  ME extends Mediator = Mediator
> extends EventEmitter implements ISingletonRepository<E> {
  public static events = {
    init: `[ SingletonRepository ][ INIT ]`,
    update: `[ SingletonRepository ][ UPDATE ]`,
    destroy: `[ SingletonRepository ][ DESTROY ]`,
  };
  @observable
  public pending: boolean;
  @observable
  public entity: E | void;

  protected Entity: new (data?: any) => E;
  protected transport: T;
  protected ws: WS;
  protected channelName: string;
  protected mediator: ME;

  protected isInit: boolean;

  constructor(
    Entity: new (data?: any) => E,
    transport: T,
    ws: WS,
    channelName: string,
    mediator: ME,
  ) {
    super();

    // * DEPS
    this.Entity = Entity;
    this.transport = transport;
    this.ws = ws;
    this.channelName = channelName;
    this.mediator = mediator;

    // * INIT
    this.isInit = false;

    // ! OBSERVABLE
    runInAction(`[ ${this.constructor.name} ][ SET_INITIAL_VALUE ]`, () => (this.pending = false));

    // * BINDINGS
    this.init = this.init.bind(this);
    this.update = this.update.bind(this);
    this.receiveMessage = this.receiveMessage.bind(this);
    this.destroy = this.destroy.bind(this);
    this.handleAssigment = this.handleAssigment.bind(this);
    this.handleCancelAssigment = this.handleCancelAssigment.bind(this);

    // ! SUBSCRIPTIONS
    this.ws.on(wsEventEnum.ASSIGMENT, this.handleAssigment);
    this.ws.on(wsEventEnum.CANCEL_ASSIGMENT, this.handleCancelAssigment);
  }

  @action("[ SINGLETON_STORE ][ INIT ]")
  public async init(): Promise<void> {
    if (!this.isInit) {
      try {
        if (this.transport.ACL.read.includes(this.transport.group)) {
          this.start();

          const entity: E | void = await this.transport.read();

          if (entity instanceof this.Entity) {
            runInAction(`[ ${this.constructor.name} ][ SUCCESS ]`, () => {
              this.entity = entity;
              this.isInit = true;

              this.entityDidInit();
              this.emit(SingletonRepository.events.init, entity);

              // ! EMIT
              this.mediator.emit(mediatorChannelEnum.repository_init, this);
            });
          } else {
            throw new Error(
              `ENTITY IS NOT ${this.Entity.name} - ${Object.prototype.toString.call(entity)}`,
            );
          }
        } else {
          throw new Error(`ACCESS DENIED`);
        }
      } catch (error) {
        console.error(`[ ${this.constructor.name} ][ INIT ][ ${getErrorMessage(error)} ]`);
      } finally {
        this.stop();
      }
    }
  }

  @action("[ SINGLETON_STORE ][ UPDATE ]")
  public async update(data: object): Promise<E | void> {
    try {
      if (this.isInit) {
        if (this.transport.ACL.update.includes(this.transport.group)) {
          this.start();

          const entity: E | void = await this.transport.update(data);

          if (entity instanceof this.Entity) {
            runInAction(`[ ${this.constructor.name} ][ SUCCESS ]`, () => (this.entity = entity));

            this.entityDidUpdate();
            this.emit(SingletonRepository.events.update, entity);

            return entity;
          } else {
            throw new Error(
              `ENTITY IS NOT ${this.Entity.name} - ${Object.prototype.toString.call(entity)}`,
            );
          }
        } else {
          throw new Error(`ACCESS DENIED`);
        }
      } else {
        throw new Error(`IS_NOT_INIT`);
      }
    } catch (error) {
      console.error(`[ ${this.constructor.name} ][ UPDATE ][ ${getErrorMessage(error)} ]`);
    } finally {
      this.stop();
    }
  }

  @action("[ COMMON_STORE ][ RECEIVE_MESSAGE ]")
  public receiveMessage([channelName, payload]: [string, any]): E | E[] | void {
    if (this.isInit) {
      try {
        if (this.channelName === channelName) {
          console.log(
            `%c[ ${this.constructor.name} ][ RECEIVE_MESSAGE ][ ${channelName} ]`,
            "color: #1890ff;",
            payload,
          );

          if (isObject(payload.create)) {
            this.entity = new this.Entity(payload.create);

            this.entityDidUpdate();
            this.emit(SingletonRepository.events.update, this.entity);

            return this.entity;
          }

          if (isObject(payload.update)) {
            this.entity = new this.Entity(payload.update);

            this.entityDidUpdate();
            this.emit(SingletonRepository.events.update, this.entity);

            return this.entity;
          }

          throw new Error("Unknow type of payload");
        }
      } catch (error) {
        console.error(
          `[ ${this.constructor.name} ][ RECEIVE_MESSAGE ]` +
            `[ ${channelName} ][ ${getErrorMessage(error)} ][ PAYLOAD: ${JSON.stringify(
              payload,
            )} ]`,
        );
      }
    } else {
      console.info(
        `%c[ ${this.constructor.name} ][ RESEIVE_MESSAGE ][ ${channelName} ][ IS_NOT_INIT ]`,
        "color: rgba(255,255,255, 0.2);",
      );
    }
  }

  protected start() {
    runInAction(`[ ${this.constructor.name} ][ START ]`, () => (this.pending = true));
  }

  protected stop() {
    runInAction(`[ ${this.constructor.name} ][ STOP ]`, () => (this.pending = false));
  }

  protected destroy(): void {
    runInAction(`[ ${this.constructor.name} ][ DESTROY ]`, () => {
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

  private handleAssigment(): void {
    try {
      this.transport.onChannel();

      if (!this.ws.has(wsEventEnum.MESSAGE_RECEIVE, this.receiveMessage)) {
        this.ws.on(wsEventEnum.MESSAGE_RECEIVE, this.receiveMessage);
      }

      console.info(`[ ${this.constructor.name} ][ ASSIGMENT ]`);
    } catch (error) {
      console.error(`[ ${this.constructor.name} ][ ASSIGMENT ][ ${getErrorMessage(error)} ]`);
    }
  }

  private handleCancelAssigment(): void {
    try {
      if (this.ws.has(wsEventEnum.MESSAGE_RECEIVE, this.receiveMessage)) {
        this.ws.off(wsEventEnum.MESSAGE_RECEIVE, this.receiveMessage);
      }

      this.destroy();

      console.info(`[ ${this.constructor.name} ][ CANCEL_ASSIGMENT ]`);
    } catch (error) {
      console.error(
        `[ ${this.constructor.name} ][ CANCEL_ASSIGMENT ][ ${getErrorMessage(error)} ]`,
      );
    }
  }
}

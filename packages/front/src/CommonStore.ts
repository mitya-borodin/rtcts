import { IPersist, wsEventEnum } from "@borodindmitriy/interfaces";
import { EventEmitter, IMediator } from "@borodindmitriy/isomorphic";
import { getErrorMessage, isObject } from "@borodindmitriy/utils";
import { action, observable, runInAction } from "mobx";
import { ICommonService } from "./interfaces/ICommonService";
import { ICommonStore } from "./interfaces/ICommonStore";
import { IWSClient } from "./interfaces/IWSClient";

export class CommonStore<
  T extends IPersist,
  S extends ICommonService<T>,
  WS extends IWSClient = IWSClient,
  ME extends IMediator = IMediator
> extends EventEmitter implements ICommonStore<T> {
  @observable
  public isInit: boolean;
  @observable
  public isLoading: boolean;
  @observable
  public data: T | void;

  protected Persist: new (data?: any) => T;
  protected service: S;
  protected ws: WS;
  protected channelName: string;
  protected mediator: ME;

  constructor(Persist: new (data?: any) => T, service: S, ws: WS, channelName: string, mediator: ME) {
    super();

    // DEPS
    this.Persist = Persist;
    this.service = service;
    this.ws = ws;
    this.channelName = channelName;
    this.mediator = mediator;

    // INIT
    this.isInit = false;
    this.isLoading = false;

    // BINDINGS
    this.init = this.init.bind(this);
    this.update = this.update.bind(this);
    this.receiveMessage = this.receiveMessage.bind(this);
    this.destroy = this.destroy.bind(this);
    this.handleAssigment = this.handleAssigment.bind(this);
    this.handleCancelAssigment = this.handleCancelAssigment.bind(this);

    // SUBSCRIPTIONS
    this.ws.on(wsEventEnum.ASSIGMENT, this.handleAssigment);
    this.ws.on(wsEventEnum.CANCEL_ASSIGMENT, this.handleCancelAssigment);
  }

  @action("[ COMMON_STORE ][ INIT ]")
  public async init(): Promise<void> {
    if (!this.isInit) {
      try {
        if (this.service.ACL.model.includes(this.service.group)) {
          this.startLoad();

          const model: T | void = await this.service.model();

          runInAction(`[ SUCCESS ]`, () => {
            this.data = model ? model : undefined;
            this.isInit = true;

            console.log(`[ ${this.constructor.name} ][ INIT ][ SUCCESS ]`);
          });
        }
      } catch (error) {
        console.error(`[ ${this.constructor.name} ][ INIT ][ ERROR_MESSAGE: ${getErrorMessage(error)} ]`);
      } finally {
        this.endLoad();
      }
    }
  }

  @action("[ COMMON_STORE ][ UPDATE ]")
  public async update(data: object): Promise<T | void> {
    if (this.isInit) {
      try {
        if (this.service.ACL.update.includes(this.service.group)) {
          this.startLoad();

          const item: T | void = await this.service.update(data);

          if (item) {
            runInAction(`[ SUCCESS ]`, () => (this.data = item));
          } else {
            throw new Error(`item is not valid: ${Object.prototype.toString.call(item)}`);
          }

          return item;
        }
      } catch (error) {
        console.error(`[ ${this.constructor.name} ][ UPDATE ][ ERROR_MESSAGE: ${getErrorMessage(error)} ]`);
      } finally {
        this.endLoad();
      }
    } else {
      console.error(`[ ${this.constructor.name} ][ UPDATE ][ ERROR_MESSAGE: IS_NOT_INIT ]`);
    }
  }

  @action("[ COMMON_STORE ][ RECEIVE_MESSAGE ]")
  public receiveMessage([channelName, payload]: [string, any]): T | T[] | void {
    if (this.isInit) {
      try {
        if (this.channelName === channelName) {
          console.log(`%c[ ${this.constructor.name} ][ RECEIVE_MESSAGE ]`, "color: #1890ff;", [channelName, payload]);

          if (isObject(payload.create)) {
            this.data = new this.Persist(payload.create);

            return this.data;
          }

          if (isObject(payload.update)) {
            this.data = new this.Persist(payload.update);

            return this.data;
          }
        }
      } catch (error) {
        console.error(
          `[ ${this.constructor.name} ][ RECEIVE_MESSAGE ][ ERROR_MESSAGE: ${
            error ? getErrorMessage(error) : error
          } ][ PAYLOAD: ${JSON.stringify([channelName, payload])} ]`,
        );
      }
    } else {
      console.info(
        `%c[ ${this.constructor.name} ][ RESEIVE_MESSAGE ][ INFO_MESSAGE: IS_NOT_INIT ]`,
        "color: rgba(255,255,255, 0.2);",
      );
    }
  }

  @action("[ COMMON_STORE ][ START_LODING ]")
  protected startLoad() {
    this.isLoading = true;
  }

  @action("[ COMMON_STORE ][ STOP_LODING ]")
  protected endLoad() {
    this.isLoading = false;
  }

  @action("[ COMMON_STORE ][ DESTROY ]")
  protected destroy(): void {
    this.isInit = false;
    this.isLoading = false;
    this.data = undefined;
  }

  private handleAssigment(): void {
    try {
      this.service.onChannel();

      if (!this.ws.has(wsEventEnum.MESSAGE_RECEIVE, this.receiveMessage)) {
        this.ws.on(wsEventEnum.MESSAGE_RECEIVE, this.receiveMessage);
      }

      console.log(`[ ${this.constructor.name} ][ ASSIGMENT ]`);
    } catch (error) {
      console.error(`[ ${this.constructor.name} ][ ASSIGMENT ][ ERROR_MESSAGE: ${getErrorMessage(error)} ]`);
    }
  }

  private handleCancelAssigment(): void {
    try {
      if (this.ws.has(wsEventEnum.MESSAGE_RECEIVE, this.receiveMessage)) {
        this.ws.off(wsEventEnum.MESSAGE_RECEIVE, this.receiveMessage);
      }

      this.destroy();

      console.log(`[ ${this.constructor.name} ][ CANCEL_ASSIGMENT ]`);
    } catch (error) {
      console.error(`[ ${this.constructor.name} ][ CANCEL_ASSIGMENT ][ ERROR_MESSAGE: ${getErrorMessage(error)} ]`);
    }
  }
}

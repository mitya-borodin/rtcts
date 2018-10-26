import { IPersist, wsEventEnum } from "@borodindmitriy/interfaces";
import { EventEmitter } from "@borodindmitriy/isomorphic";
import { getErrorMessage, isArray, isObject } from "@borodindmitriy/utils";
import { computed, observable, ObservableMap, runInAction } from "mobx";
import { IMediator } from "./interfaces/IMediator";
import { IRepository } from "./interfaces/IRepository";
import { IService } from "./interfaces/IService";
import { IWSClient } from "./interfaces/IWSClient";

export class Repository<
  T extends IPersist,
  S extends IService<T>,
  WS extends IWSClient = IWSClient,
  ME extends IMediator = IMediator
> extends EventEmitter implements IRepository<T> {
  @observable
  public isInit: boolean;
  @observable
  public isLoading: boolean;

  @observable
  protected collection: ObservableMap<string, T>;

  protected Persist: { new (data?: any): T };
  protected service: S;
  protected ws: WS;
  protected channelName: string;
  protected mediator: ME;

  constructor(Persist: { new (data?: any): T }, service: S, ws: WS, channelName: string, mediator: ME) {
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
    this.collection = observable.map();

    // BINDINGS
    this.init = this.init.bind(this);
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
    this.remove = this.remove.bind(this);
    this.receiveMessage = this.receiveMessage.bind(this);
    this.destroy = this.destroy.bind(this);
    this.handleAssigment = this.handleAssigment.bind(this);
    this.handleCancelAssigment = this.handleCancelAssigment.bind(this);

    // SUBSCRIPTIONS
    this.ws.on(wsEventEnum.ASSIGMENT, this.handleAssigment);
    this.ws.on(wsEventEnum.CANCEL_ASSIGMENT, this.handleCancelAssigment);
  }

  @computed({ name: "[ REPOSITORY ][ MAP ]" })
  get map(): ObservableMap<string, T> {
    return this.collection;
  }

  @computed({ name: "[ REPOSITORY ][ PLAIN_MAP ]" })
  get plainMap(): Map<string, T> {
    const map: Map<string, T> = new Map();

    this.collection.forEach((val, key) => map.set(key, val));

    return map;
  }

  @computed({ name: "[ REPOSITORY ][ LIST ]" })
  get list(): T[] {
    const list: T[] = [];

    this.collection.forEach((item) => {
      list.push(item);
    });

    return list;
  }

  public async init(): Promise<void> {
    if (!this.isInit) {
      try {
        if (this.service.ACL.collection.includes(this.service.group)) {
          this.startLoad();

          const collection: T[] | void = await this.service.collection();

          if (isArray(collection)) {
            runInAction(`[ ${this.constructor.name} ][ INIT ][ SUCCESS ]`, () => {
              this.collection = collection.reduce<ObservableMap<string, T>>(
                (preValue, item: T) => preValue.set(item.id, item),
                observable.map(),
              );

              this.isInit = true;
              console.log(`[ ${this.constructor.name} ][ INIT ][ SUCCESS ]`);
            });
          } else {
            throw new Error(`collection: ${Object.prototype.toString.call(collection)}`);
          }
        }
      } catch (error) {
        console.error(`[ ${this.constructor.name} ][ INIT ][ ERROR_MESSAGE: ${getErrorMessage(error)} ]`);

        return Promise.reject();
      } finally {
        this.endLoad();
      }
    }
  }

  public async create(data: object): Promise<T | void> {
    if (this.isInit) {
      try {
        if (this.service.ACL.create.includes(this.service.group)) {
          this.startLoad();

          const item: T | void = await this.service.create(data);

          if (item) {
            runInAction(`[ ${this.constructor.name} ][ CREATE ][ SUCCESS ]`, () => {
              this.collection.set(item.id, item);
            });
          } else {
            throw new Error(`item: ${Object.prototype.toString.call(item)}`);
          }

          return item;
        }
      } catch (error) {
        console.error(`[ ${this.constructor.name} ][ CREATE ][ ERROR_MESSAGE: ${getErrorMessage(error)} ]`);

        return Promise.reject();
      } finally {
        this.endLoad();
      }
    } else {
      console.error(`[ ${this.constructor.name} ][ CREATE ][ ERROR_MESSAGE: IS_NOT_INIT ]`);

      return Promise.reject();
    }
  }

  public async update(data: object): Promise<T | void> {
    if (this.isInit) {
      try {
        if (this.service.ACL.update.includes(this.service.group)) {
          this.startLoad();

          const item: T | void = await this.service.update(data);

          if (item) {
            runInAction(`[ ${this.constructor.name} ][ UPDATE ][ SUCCESS ]`, () => {
              this.collection.set(item.id, item);
            });
          } else {
            throw new Error(`item: ${Object.prototype.toString.call(item)}`);
          }

          return item;
        }
      } catch (error) {
        console.error(`[ ${this.constructor.name} ][ UPDATE ][ ERROR_MESSAGE: ${getErrorMessage(error)} ]`);

        return Promise.reject();
      } finally {
        this.endLoad();
      }
    } else {
      console.error(`[ ${this.constructor.name} ][ UPDATE ][ ERROR_MESSAGE: IS_NOT_INIT ]`);

      return Promise.reject();
    }
  }

  public async remove(id: string): Promise<T | void> {
    if (this.isInit) {
      try {
        if (this.service.ACL.remove.includes(this.service.group)) {
          this.startLoad();

          const item: T | void = await this.service.remove(id);

          if (item) {
            runInAction(`[ ${this.constructor.name} ][ REMOVE ][ SUCCESS ]`, () => {
              this.collection.delete(item.id);
            });
          } else {
            throw new Error(`item: ${Object.prototype.toString.call(item)}`);
          }

          return item;
        }
      } catch (error) {
        console.error(`[ ${this.constructor.name} ][ UPDATE ][ ERROR_MESSAGE: ${getErrorMessage(error)} ]`);

        return Promise.reject();
      } finally {
        this.endLoad();
      }
    } else {
      console.error(`[ ${this.constructor.name} ][ UPDATE ][ ERROR_MESSAGE: IS_NOT_INIT ]`);

      return Promise.reject();
    }
  }

  public receiveMessage([channelName, payload]: [string, any]): void {
    if (this.isInit) {
      try {
        console.log(`[ ${this.constructor.name} ][ RECEIVE_MESSAGE ]`, [channelName, payload]);

        if (this.channelName === channelName) {
          if (isObject(payload.create)) {
            const item: T = new this.Persist(payload.create);

            this.collection.set(item.id, item);
          }

          if (isArray(payload.bulkCreate)) {
            for (const create of payload.bulkCreate) {
              const item: T = new this.Persist(create);

              this.collection.set(item.id, item);
            }
          }

          if (isObject(payload.update)) {
            const item: T = new this.Persist(payload.update);

            this.collection.set(item.id, item);
          }

          if (isArray(payload.bulkUpdate)) {
            for (const update of payload.bulkUpdate) {
              const item: T = new this.Persist(update);

              this.collection.set(item.id, item);
            }
          }

          if (isObject(payload.remove)) {
            this.collection.delete(payload.remove.id);
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
      console.error(`[ ${this.constructor.name} ][ RESEIVE_MESSAGE ][ ERROR_MESSAGE: IS_NOT_INIT ]`);
    }
  }

  protected startLoad() {
    runInAction(`[ ${this.constructor.name} ][ START_LODING ]`, () => {
      this.isLoading = true;
    });
  }

  protected endLoad() {
    runInAction(`[ ${this.constructor.name} ][ END_LODING ]`, () => {
      this.isLoading = false;
    });
  }

  protected destroy(): void {
    runInAction(`[ ${this.constructor.name} ][ DESTROY ]`, () => {
      this.isInit = false;
      this.isLoading = false;
      this.collection.clear();
    });
  }

  private handleAssigment() {
    try {
      this.service.onChannel();

      if (!this.ws.has(wsEventEnum.MESSAGE_RECEIVE, this.receiveMessage)) {
        this.ws.on(wsEventEnum.MESSAGE_RECEIVE, this.receiveMessage);
      }

      console.log(`[ ${this.constructor.name} ][ ASSIGMENT ]`);
    } catch (error) {
      console.error(`[ ${this.constructor.name} ][ ASSIGMENT ][ ERROR_MESSAGE: ${getErrorMessage(error)} ]`);

      return Promise.reject();
    }
  }

  private handleCancelAssigment() {
    try {
      if (this.ws.has(wsEventEnum.MESSAGE_RECEIVE, this.receiveMessage)) {
        this.ws.off(wsEventEnum.MESSAGE_RECEIVE, this.receiveMessage);
      }

      this.destroy();

      console.log(`[ ${this.constructor.name} ][ CANCEL_ASSIGMENT ]`);
    } catch (error) {
      console.error(`[ ${this.constructor.name} ][ CANCEL_ASSIGMENT ][ ERROR_MESSAGE: ${getErrorMessage(error)} ]`);

      return Promise.reject();
    }
  }
}

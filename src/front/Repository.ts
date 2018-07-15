import { computed, observable, ObservableMap, runInAction } from "mobx";
import { wsEventEnum } from "../enums/wsEventEnum";
import { EventEmitter } from "../isomorphic/EventEmitter";
import { isArray, isString } from "../utils/isType";
import { IMediator } from "./interfaces/IMediator";
import { IRepository } from "./interfaces/IRepository";
import { IService } from "./interfaces/IService";
import { IWSClient } from "./interfaces/IWSClient";

export class Repository<T extends { id: string | void }, S extends IService<T>> extends EventEmitter
  implements IRepository<T> {
  @observable protected loading: boolean;
  @observable protected wasInit: boolean;
  @observable protected collection: ObservableMap<string, T>;

  protected Persist: { new (data?: any): T };
  protected service: S;
  protected wsClient: IWSClient;
  protected channelName: string;
  protected mediator: IMediator;

  constructor(
    Persist: { new (data?: any): T },
    service: S,
    wsClient: IWSClient,
    channelName: string,
    mediator: IMediator,
  ) {
    super();

    // DEPS
    this.Persist = Persist;
    this.service = service;
    this.wsClient = wsClient;
    this.channelName = channelName;
    this.mediator = mediator;

    // INIT
    this.wasInit = false;
    this.loading = false;
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
    this.wsClient.on(wsEventEnum.ASSIGMENT, this.handleAssigment);
    this.wsClient.on(wsEventEnum.CANCEL_ASSIGMENT, this.handleCancelAssigment);
  }

  @computed({ name: "[ REPOSITORY ][ IS_LOADING ]" })
  get isLoading(): boolean {
    return this.loading;
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
    if (!this.wasInit) {
      try {
        console.time(`[ ${this.constructor.name}  ][ INIT ]`);

        this.startLoad();

        const collection: T[] | void = await this.service.collection();

        if (isArray(collection)) {
          runInAction(`[ REPOSITORY ][ INIT ][ ${this.constructor.name} ][ SUCCESS ]`, () => {
            this.collection = collection.reduce<ObservableMap<string, T>>((preValue, item: T) => {
              if (isString(item.id)) {
                preValue.set(item.id, item);
              }

              return preValue;
            }, observable.map());

            this.wasInit = true;
          });
        }

        console.timeEnd(`[ ${this.constructor.name}  ][ INIT ]`);
      } catch (error) {
        console.error(`[ REPOSITORY ][ INIT ][ ${this.constructor.name} ][ ERROR ]`);
        console.error(error);
      } finally {
        this.endLoad();
      }
    }
  }

  public async create(data: object): Promise<T | void> {
    try {
      console.time(`[ ${this.constructor.name}  ][ CREATE ]`);

      this.startLoad();

      const item: T | void = await this.service.create(data);

      if (item) {
        runInAction(`[ REPOSITORY ][ CREATE ][ ${this.constructor.name} ][ SUCCESS ]`, () => {
          if (isString(item.id)) {
            this.collection.set(item.id, item);
          } else {
            console.error(`[ REPOSITORY ][ CREATE ][ ${this.constructor.name} ][ ERROR ]`);
            console.error(item);
          }
        });
      }

      console.timeEnd(`[ ${this.constructor.name}  ][ CREATE ]`);

      return item;
    } catch (error) {
      console.error(`[ REPOSITORY ][ CREATE ][ ${this.constructor.name} ][ ERROR ]`);
      console.error(error);
    } finally {
      this.endLoad();
    }
  }

  public async update(data: object): Promise<T | void> {
    try {
      console.time(`[ ${this.constructor.name}  ][ UPDATE ]`);

      this.startLoad();

      const item: T | void = await this.service.update(data);

      if (item) {
        runInAction(`[ REPOSITORY ][ UPDATE ][ ${this.constructor.name} ][ SUCCESS ]`, () => {
          if (isString(item.id)) {
            this.collection.set(item.id, item);
          } else {
            console.error(`[ REPOSITORY ][ UPDATE ][ ${this.constructor.name} ][ ERROR ]`);
            console.error(item);
          }
        });
      }

      console.timeEnd(`[ ${this.constructor.name}  ][ UPDATE ]`);

      return item;
    } catch (error) {
      console.error(`[ REPOSITORY ][ UPDATE ][ ${this.constructor.name} ][ ERROR ]`);
      console.error(error);
    } finally {
      this.endLoad();
    }
  }

  public async remove(id: string): Promise<T | void> {
    try {
      console.time(`[ ${this.constructor.name}  ][ REMOVE ]`);

      this.startLoad();

      const item: T | void = await this.service.remove(id);

      if (item) {
        runInAction(`[ REPOSITORY ][ REMOVE ][ ${this.constructor.name} ][ SUCCESS ]`, () => {
          if (isString(item.id)) {
            this.collection.delete(item.id);
          } else {
            console.error(`[ REPOSITORY ][ REMOVE ][ ${this.constructor.name} ][ ERROR ]`);
            console.error(item);
          }
        });
      }

      console.timeEnd(`[ ${this.constructor.name}  ][ REMOVE ]`);

      return item;
    } catch (error) {
      console.error(`[ REPOSITORY ][ REMOVE ][ ${this.constructor.name} ][ ERROR ]`);
      console.error(error);
    } finally {
      this.endLoad();
    }
  }

  public receiveMessage([channelName, payload]: [string, any]): T | void | Promise<void> {
    try {
      console.log(`[ REPOSITORY ][ RECEIVE_MESSAGE ][ ${this.constructor.name} ]`, [channelName, payload]);

      if (this.channelName === channelName) {
        if (payload.create) {
          const item: T = new this.Persist(payload.create);

          if (isString(item.id)) {
            this.collection.set(item.id, item);
          } else {
            console.error(`[ REPOSITORY ][ CREATE_MESSAGE ][ ${this.constructor.name} ][ ERROR ]`, item);
          }

          return item;
        }

        if (payload.update) {
          const item: T = new this.Persist(payload.update);

          if (isString(item.id)) {
            this.collection.set(item.id, item);
          } else {
            console.error(`[ REPOSITORY ][ UPDATE_MESSAGE ][ ${this.constructor.name} ][ ERROR ]`, item);
          }

          return item;
        }

        if (payload.remove) {
          const item: T | void = this.collection.get(payload.remove.id);

          this.collection.delete(payload.remove.id);

          return item;
        }
      }
    } catch (error) {
      console.error(`[ REPOSITORY ][ RECEIVE_MESSAGE ][ ${this.constructor.name} ][ ERROR ]`, [channelName, payload]);
      console.error(error);
    }
  }

  protected startLoad() {
    runInAction(`[ REPOSITORY ][ ${this.constructor.name} ][ START_LODING ]`, () => {
      this.loading = true;
    });
  }

  protected endLoad() {
    runInAction(`[ REPOSITORY ][ ${this.constructor.name} ][ END_LODING ]`, () => {
      this.loading = false;
    });
  }

  protected destroy(): void {
    runInAction(`[ REPOSITORY ][ ${this.constructor.name} ][ DESTROY ]`, () => {
      this.wasInit = false;
      this.loading = false;
      this.collection.clear();
    });
  }

  private handleAssigment() {
    try {
      this.service.onChannel();

      if (!this.wsClient.has(wsEventEnum.MESSAGE_RECEIVE, this.receiveMessage)) {
        this.wsClient.on(wsEventEnum.MESSAGE_RECEIVE, this.receiveMessage);
      }

      console.log(`[ REPOSITORY ][ ${this.constructor.name} ][ ASSIGMENT ]`);
    } catch (error) {
      console.error(`[ REPOSITORY ][ ${this.constructor.name} ][ ASSIGMENT ][ ERROR ]`);
      console.error(error);
    }
  }

  private handleCancelAssigment() {
    try {
      if (this.wsClient.has(wsEventEnum.MESSAGE_RECEIVE, this.receiveMessage)) {
        this.wsClient.off(wsEventEnum.MESSAGE_RECEIVE, this.receiveMessage);
      }

      this.destroy();

      console.log(`[ REPOSITORY ][ ${this.constructor.name} ][ CANCEL_ASSIGMENT ]`);
    } catch (error) {
      console.error(`[ REPOSITORY ][ ${this.constructor.name} ][ CANCEL_ASSIGMENT ][ ERROR ]`);
      console.error(error);
    }
  }
}

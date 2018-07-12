import { action, computed, observable, ObservableMap, runInAction } from "mobx";
import { IUser } from "../interfaces/IUser";
import { IUserGroup } from "../interfaces/IUserGroup";
import { isString } from "../utils/isType";
import { IRepositoryStore } from "./interfaces/IRepositoryStore";
import { IService } from "./interfaces/IService";
import { IUserStore } from "./interfaces/IUserStore";
import { IWSClient } from "./interfaces/IWSClient";
import { Store } from "./Store";

export class RepositoryStore<
  T extends { id: string | void },
  S extends IService<T>,
  US extends IUserStore<U, G>,
  U extends IUser<G>,
  G extends IUserGroup
> extends Store<T, S, US, U, G> implements IRepositoryStore<T> {
  @observable protected collection = observable.map<string, T>();

  protected repoName: string;
  protected chName: string;
  protected Constructor: { new (data?: any): T };

  constructor(
    service: S,
    name: string,
    chName: string,
    Constructor: { new (data?: any): T },
    wsClient: IWSClient,
    userStore: US,
  ) {
    super(service, wsClient, userStore);

    // DEPS
    this.repoName = name.toUpperCase();

    this.chName = chName;
    this.Constructor = Constructor;

    // BINDINGS
    this.init = this.init.bind(this);
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
    this.remove = this.remove.bind(this);
    this.receiveMessage = this.receiveMessage.bind(this);
    this.destroy = this.destroy.bind(this);
  }

  @computed
  get map(): ObservableMap<string, T> {
    return this.collection;
  }

  @computed
  get plainMap(): Map<string, T> {
    const map: Map<string, T> = new Map();

    this.collection.forEach((val, key) => map.set(key, val));

    return map;
  }

  @computed
  get list(): T[] {
    const list: T[] = [];

    this.collection.forEach((item) => {
      list.push(item);
    });

    return list;
  }

  public async init(): Promise<void> {
    if (!this.wasInit) {
      this.startLoad();

      try {
        const collection: T[] | void = await this.service.collection();

        if (collection) {
          runInAction(`[ REPOSITORY_BASE ][ INIT ][ SUCCESS ]`, () => {
            this.collection = collection.reduce<ObservableMap<string, T>>((preValue, item: T) => {
              if (isString(item.id)) {
                preValue.set(item.id, item);
              }

              return preValue;
            }, observable.map());

            this.wasInit = true;
          });
        }
      } catch (error) {
        console.error(error);
      } finally {
        this.endLoad();
      }
    }
  }

  public async create(data: object): Promise<T | void> {
    if (!this.loading) {
      this.startLoad();

      try {
        const item: T | void = await this.service.create(data);

        if (item) {
          runInAction(`[ REPOSITORY_BASE ][ CREATE ][ SUCCESS ]`, () => {
            if (isString(item.id)) {
              this.collection.set(item.id, item);
            } else {
              console.error(`[ REPOSITORY_BASE ][ CREATE ] - must have id as string;`, item);
            }
          });
        }

        return item;
      } catch (error) {
        console.error(error);
      } finally {
        this.endLoad();
      }
    }
  }

  @action(`[ REPOSITORY_BASE ][ UPDATE ]`)
  public async update(data: object): Promise<T | void> {
    if (!this.loading) {
      this.startLoad();

      try {
        const item: T | void = await this.service.update(data);

        if (item) {
          runInAction(`[ REPOSITORY_BASE ][ UPDATE ][ SUCCESS ]`, () => {
            if (isString(item.id)) {
              this.collection.set(item.id, item);
            } else {
              console.error(`[ REPOSITORY_BASE ][ UPDATE ][ ERROR ] - must have id as string;`, item);
            }
          });
        }

        return item;
      } catch (error) {
        return Promise.reject(error);
      } finally {
        this.endLoad();
      }
    }
  }

  public async remove(id: string): Promise<T | void> {
    if (!this.loading) {
      this.startLoad();

      try {
        const item: T | void = await this.service.remove(id);

        if (item) {
          runInAction(`[ REPOSITORY_BASE ][ REMOVE ][ SUCCESS ]`, () => {
            if (isString(item.id)) {
              this.collection.delete(item.id);
            } else {
              console.error(`[ REPOSITORY_BASE ][ REMOVE ][ ERROR ] - must have id as string;`, item);
            }
          });
        }

        return item;
      } catch (error) {
        console.error(error);
        return Promise.reject(error);
      } finally {
        this.endLoad();
      }
    }
  }

  @action(`[ REPOSITORY_BASE ][ RECEIVE_MESSAGE ]`)
  public receiveMessage([chName, payload]: [string, any]): T | void | Promise<void> {
    console.log(`[ ${this.repoName} ][ RECEIVE_MESSAGE ]`, [chName, payload]);

    if (this.chName === chName) {
      if (payload.create) {
        const item: T = new this.Constructor(payload.create);

        if (isString(item.id)) {
          this.collection.set(item.id, item);
        } else {
          console.error(`[ ${this.repoName} ][ RECEIVE_CREATE ] - must have id as string;`, item);
        }

        return item;
      }
      if (payload.update) {
        const item: T = new this.Constructor(payload.update);

        if (isString(item.id)) {
          this.collection.set(item.id, item);
        } else {
          console.error(`[ ${this.repoName} ][ RECEIVE_UPDATE ] - must have id as string;`, item);
        }

        return item;
      }
      if (payload.remove) {
        const item: T | void = this.collection.get(payload.remove.id);

        this.collection.delete(payload.remove.id);

        return item;
      }
    }
  }

  protected destroy(): void {
    super.destroy();

    this.collection.clear();
  }
}

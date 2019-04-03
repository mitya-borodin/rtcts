import { IEntity, wsEventEnum } from "@borodindmitriy/interfaces";
import { IMediator } from "@borodindmitriy/isomorphic";
import { getErrorMessage, isArray, isObject } from "@borodindmitriy/utils";
import { action, computed, observable, ObservableMap, runInAction } from "mobx";
import { mediatorChannelEnum } from "../../enums/mediatorChannelEnum";
import { IRepository } from "../../interfaces/repository/IRepository";
import { IRepositoryHTTPTransport } from "../../interfaces/transport/http/IRepositoryHTTPTransport";
import { IWSClient } from "../../interfaces/transport/ws/IWSClient";

export class Repository<
  E extends IEntity,
  T extends IRepositoryHTTPTransport<E>,
  WS extends IWSClient = IWSClient,
  ME extends IMediator = IMediator
> implements IRepository<E> {
  @observable
  public pending: boolean;

  @observable
  protected collection: ObservableMap<string, E>;

  protected Entity: new (data?: any) => E;
  protected transport: T;
  protected mediator: ME;
  protected ws: WS;
  protected channelName: string;

  protected isInit: boolean;

  constructor(Entity: new (data?: any) => E, transport: T, mediator: ME, ws: WS, channelName: string) {
    // * DEPS
    this.Entity = Entity;
    this.transport = transport;
    this.mediator = mediator;
    this.ws = ws;
    this.channelName = channelName;

    // * INIT
    this.isInit = false;

    // ! OBSERVABLE
    runInAction(`[ ${this.constructor.name} ][ SET_INITIAL_VALUE ]`, () => {
      this.pending = false;
      this.collection = observable.map();
    });

    // * BINDINGS
    this.init = this.init.bind(this);
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
    this.remove = this.remove.bind(this);
    this.receiveMessage = this.receiveMessage.bind(this);
    this.destroy = this.destroy.bind(this);
    this.handleAssigment = this.handleAssigment.bind(this);
    this.handleCancelAssigment = this.handleCancelAssigment.bind(this);
    this.filter = this.filter.bind(this);

    // ! SUBSCRIPTIONS
    this.ws.on(wsEventEnum.ASSIGMENT, this.handleAssigment);
    this.ws.on(wsEventEnum.CANCEL_ASSIGMENT, this.handleCancelAssigment);
  }

  @computed({ name: "[ REPOSITORY ][ MAP ]" })
  get map(): ObservableMap<string, E> {
    return this.collection;
  }

  @computed({ name: "[ REPOSITORY ][ LIST ]" })
  get list(): E[] {
    const list: E[] = [];

    for (const value of this.collection.values()) {
      list.push(value);
    }

    return this.filter(list);
  }

  @action("[ REPOSITORY ][ INIT ]")
  public async init(): Promise<void> {
    if (!this.isInit) {
      try {
        if (this.transport.ACL.collection.includes(this.transport.group)) {
          this.start();

          const collection: E[] | void = await this.transport.collection();

          if (isArray(collection)) {
            runInAction(`[ ${this.constructor.name} ][ SUCCESS ]`, () => {
              for (const item of collection) {
                this.collection.set(item.id, item);
              }

              this.isInit = true;

              this.collectionDidUpdate();

              // ! EMIT
              this.mediator.emit(mediatorChannelEnum.repository__init_success, this);
            });
          } else {
            throw new Error(`COLLECTION IS NOT ARRAY - ${Object.prototype.toString.call(collection)}`);
          }
        } else {
          throw new Error(`ACCESS DENIED`);
        }
      } catch (error) {
        console.error(`[ ${this.constructor.name} ][ INIT ][ ${getErrorMessage(error)} ]`);

        return Promise.reject();
      } finally {
        this.stop();
      }
    }
  }

  @action("[ REPOSITORY ][ CREATE ]")
  public async create(data: object): Promise<E | void> {
    try {
      if (this.isInit) {
        if (this.transport.ACL.create.includes(this.transport.group)) {
          this.start();

          const item: E | void = await this.transport.create(data);

          if (item instanceof this.Entity) {
            runInAction(`[ ${this.constructor.name} ][ SUCCESS ]`, () => this.collection.set(item.id, item));

            this.collectionDidUpdate();

            return item;
          } else {
            throw new Error(`ITEM IS NOT ${this.Entity.name} - ${Object.prototype.toString.call(item)}`);
          }
        } else {
          throw new Error(`ACCESS DENIED`);
        }
      } else {
        throw new Error(`IS_NOT_INIT`);
      }
    } catch (error) {
      console.error(`[ ${this.constructor.name} ][ CREATE ][ ${getErrorMessage(error)} ]`);

      return Promise.reject();
    } finally {
      this.stop();
    }
  }

  @action("[ REPOSITORY ][ UPDATE ]")
  public async update(data: object): Promise<E | void> {
    try {
      if (this.isInit) {
        if (this.transport.ACL.update.includes(this.transport.group)) {
          this.start();

          const item: E | void = await this.transport.update(data);

          if (item instanceof this.Entity) {
            runInAction(`[ ${this.constructor.name} ][ SUCCESS ]`, () => this.collection.set(item.id, item));

            this.collectionDidUpdate();

            return item;
          } else {
            throw new Error(`ITEM IS NOT ${this.Entity.name} - ${Object.prototype.toString.call(item)}`);
          }
        } else {
          throw new Error(`ACCESS DENIED`);
        }
      } else {
        throw new Error(`IS_NOT_INIT`);
      }
    } catch (error) {
      console.error(`[ ${this.constructor.name} ][ UPDATE ][ ${getErrorMessage(error)} ]`);

      return Promise.reject();
    } finally {
      this.stop();
    }
  }

  @action("[ REPOSITORY ][ REMOVE ]")
  public async remove(id: string): Promise<E | void> {
    try {
      if (this.isInit) {
        if (this.transport.ACL.remove.includes(this.transport.group)) {
          this.start();

          const item: E | void = await this.transport.remove(id);

          if (item instanceof this.Entity) {
            runInAction(`[ ${this.constructor.name} ][ SUCCESS ]`, () => this.collection.delete(item.id));

            this.collectionDidUpdate();

            return item;
          } else {
            throw new Error(`ITEM IS NOT ${this.Entity.name} - ${Object.prototype.toString.call(item)}`);
          }
        } else {
          throw new Error(`ACCESS DENIED`);
        }
      } else {
        throw new Error(`IS_NOT_INIT`);
      }
    } catch (error) {
      console.error(`[ ${this.constructor.name} ][ REMOVE ][ ${getErrorMessage(error)} ]`);

      return Promise.reject();
    } finally {
      this.stop();
    }
  }

  @action("[ REPOSITORY ][ RECEIVE_MESSAGE ]")
  protected receiveMessage([channelName, payload]: [string, any]): E | E[] | void {
    if (this.isInit) {
      try {
        if (this.channelName === channelName) {
          console.log(
            `%c[ ${this.constructor.name} ][ RECEIVE_MESSAGE ][ ${channelName} ]`,
            "color: #1890ff;",
            payload,
          );

          if (isObject(payload.create)) {
            const item: E = new this.Entity(payload.create);

            this.collection.set(item.id, item);

            this.collectionDidUpdate();

            return item;
          }

          if (isArray(payload.bulkCreate)) {
            const items: E[] = [];

            for (const create of payload.bulkCreate) {
              const item: E = new this.Entity(create);

              this.collection.set(item.id, item);

              items.push(item);
            }

            this.collectionDidUpdate();

            return items;
          }

          if (isObject(payload.update)) {
            const item: E = new this.Entity(payload.update);

            this.collection.set(item.id, item);

            this.collectionDidUpdate();

            return item;
          }

          if (isArray(payload.bulkUpdate)) {
            const items: E[] = [];

            for (const update of payload.bulkUpdate) {
              const item: E = new this.Entity(update);

              this.collection.set(item.id, item);

              items.push(item);
            }

            this.collectionDidUpdate();

            return items;
          }

          if (isObject(payload.remove)) {
            const item = this.collection.get(payload.remove.id);

            this.collection.delete(payload.remove.id);

            this.collectionDidUpdate();

            return item;
          }

          throw new Error("Unknow type of payload");
        }
      } catch (error) {
        console.error(
          `[ ${this.constructor.name} ][ RECEIVE_MESSAGE ][ ${channelName} ]` +
            `[ PAYLOAD: ${JSON.stringify(payload)} ]` +
            `[ ${getErrorMessage(error)} ]`,
        );
      }
    } else {
      console.info(`%c[ ${this.constructor.name} ][ IS_NOT_INIT ]`, "color: rgba(255,255,255, 0.2);");
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
      this.collection.clear();

      this.collectionDidUpdate();
    });
  }

  protected filter(list: E[]): E[] {
    return list;
  }

  protected collectionDidUpdate(): void {
    // ! HOOK FOR COLLECTION UPDATE
  }

  private handleAssigment(): void {
    try {
      this.transport.onChannel();

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

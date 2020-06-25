import { Entity, ListResponse, Response, wsEventEnum } from "@rtcts/isomorphic";
import { getErrorMessage, isArray, isObject } from "@rtcts/utils";
import EventEmitter from "eventemitter3";
import { action, computed, observable, ObservableMap, runInAction } from "mobx";
import { repositoryPubSubEnum } from "../enums/repositoryPubSubEnum";
import { RepositoryHttpTransport } from "../transport/http/RepositoryHttpTransport";
import { WSClient } from "../transport/ws/WSClient";

export class Repository<
  HTTP_TRANSPORT extends RepositoryHttpTransport<ENTITY, DATA, VA, WS, PUB_SUB>,
  ENTITY extends Entity<DATA, VA>,
  DATA,
  VA extends object = object,
  WS extends WSClient = WSClient,
  PUB_SUB extends EventEmitter = EventEmitter
> extends EventEmitter {
  public static events = {
    init: `Repository.init`,
    update: `Repository.update`,
    updateSubmit: `Repository.updateSubmit`,
    remove: `Repository.remove`,
    removeSubmit: `Repository.removeSubmit`,
    destroy: `Repository.destroy`,
  };
  @observable
  public pending: boolean;

  @observable
  protected collection: ObservableMap<string, ENTITY>;

  protected Entity: new (data?: any) => ENTITY;
  protected httpTransport: HTTP_TRANSPORT;
  protected pubSub: PUB_SUB;
  protected ws: WS;
  protected channelName: string;

  protected isInit: boolean;

  constructor(
    httpTransport: HTTP_TRANSPORT,
    Entity: new (data?: any) => ENTITY,
    ws: WS,
    channelName: string,
    pubSub: PUB_SUB,
  ) {
    super();

    // * DEPS
    this.Entity = Entity;
    this.httpTransport = httpTransport;
    this.pubSub = pubSub;
    this.ws = ws;
    this.channelName = channelName;

    // * INIT
    this.isInit = false;

    // ! OBSERVABLE
    this.pending = false;
    this.collection = observable.map<string, ENTITY>();

    // * BINDINGS
    this.init = this.init.bind(this);
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
    this.remove = this.remove.bind(this);
    this.receiveMessage = this.receiveMessage.bind(this);
    this.destroy = this.destroy.bind(this);
    this.handleUserBindedToConnection = this.handleUserBindedToConnection.bind(this);
    this.handleUserUnBindedToConnection = this.handleUserUnBindedToConnection.bind(this);
    this.filter = this.filter.bind(this);

    // ! SUBSCRIPTIONS
    this.ws.on(wsEventEnum.USER_BIND_TO_CONNECTION, this.handleUserBindedToConnection);
    this.ws.on(wsEventEnum.USER_UNBIND_FROM_CONNECTION, this.handleUserUnBindedToConnection);
  }

  @computed({ name: "Repository.map" })
  get map(): ObservableMap<string, ENTITY> {
    return this.collection;
  }

  @computed({ name: "Repository.list" })
  get list(): ENTITY[] {
    const list: ENTITY[] = [];

    for (const value of this.collection.values()) {
      list.push(value);
    }

    return this.filter(list);
  }

  @action("Repository.init")
  public async init(): Promise<void> {
    if (this.isInit) {
      return;
    }

    try {
      if (!this.httpTransport.ACL.collection.includes(this.httpTransport.currentUserGroup)) {
        throw new Error(`access denied for (${this.httpTransport.currentUserGroup})`);
      }

      this.start();

      const listResponse: ListResponse | void = await this.httpTransport.getList();

      if (!listResponse) {
        throw new Error(`response is empty`);
      }

      runInAction(`Initialization (${this.constructor.name}) has been succeed`, () => {
        const collection: ENTITY[] = [];

        for (const item of listResponse.results) {
          if (item.isEntity()) {
            this.collection.set(item.id, item);

            collection.push(item);
          }
        }

        this.isInit = true;

        this.repositoryDidInit(collection);

        this.emit(Repository.events.init, collection);

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

  @action("Repository.create")
  public async create(data: object): Promise<ENTITY | void> {
    try {
      if (!this.isInit) {
        throw new Error(`doesn't initialized yet`);
      }

      if (!this.httpTransport.ACL.create.includes(this.httpTransport.currentUserGroup)) {
        throw new Error(`access denied for (${this.httpTransport.currentUserGroup})`);
      }

      this.start();

      const response: Response<ENTITY> | void = await this.httpTransport.create(data);

      if (!response) {
        throw new Error(`response is empty`);
      }

      const entity = response.result;

      if (!entity.isEntity()) {
        return;
      }

      runInAction(`Create (${this.constructor.name}) succeed`, () => {
        this.collection.set(entity.id, entity);
      });

      this.collectionDidUpdate([entity]);

      this.emit(Repository.events.update, [entity]);
      this.emit(Repository.events.updateSubmit, [entity]);

      return entity;
    } catch (error) {
      console.error(`Create (${this.constructor.name}) failed: ${getErrorMessage(error)}`);
    } finally {
      this.stop();
    }
  }
  @action("Repository.update")
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

      const entity = response.result;

      if (!entity.isEntity()) {
        return;
      }

      runInAction(`Update (${this.constructor.name}) succeed`, () => {
        this.collection.set(entity.id, entity);
      });

      this.collectionDidUpdate([entity]);

      this.emit(Repository.events.update, [entity]);
      this.emit(Repository.events.updateSubmit, [entity]);

      return entity;
    } catch (error) {
      console.error(`Update (${this.constructor.name}) failed: ${getErrorMessage(error)}`);
    } finally {
      this.stop();
    }
  }

  @action("Repository.remove")
  public async remove(id: string): Promise<ENTITY | void> {
    try {
      if (!this.isInit) {
        throw new Error(`doesn't initialized yet`);
      }

      if (!this.httpTransport.ACL.remove.includes(this.httpTransport.currentUserGroup)) {
        throw new Error(`access denied for (${this.httpTransport.currentUserGroup})`);
      }

      this.start();

      const response: Response<ENTITY> | void = await this.httpTransport.remove(id);

      if (!response) {
        throw new Error(`response is empty`);
      }

      const entity = response.result;

      if (!entity.isEntity()) {
        return;
      }

      runInAction(`Remove (${this.constructor.name}) succeed`, () => {
        this.collection.delete(entity.id);
      });

      this.collectionDidRemove([entity]);

      this.emit(Repository.events.remove, [entity]);
      this.emit(Repository.events.removeSubmit, [entity]);

      return entity;
    } catch (error) {
      console.error(`Remove (${this.constructor.name}) failed: ${getErrorMessage(error)}`);
    } finally {
      this.stop();
    }
  }

  @action("Repository.receiveMessage")
  protected receiveMessage([channelName, payload]: [string, any]): ENTITY | ENTITY[] | void {
    if (!this.isInit) {
      console.info(
        `%cReceive message for (${this.constructor.name}) doesn't initialized yet`,
        "color: rgba(255,255,255, 0.2);",
      );
    }

    try {
      if (this.channelName === channelName) {
        console.log(
          `%cReceive message for (${this.constructor.name}) from channel ${channelName}`,
          "color: #1890ff;",
          payload,
        );

        if (isObject(payload.create)) {
          const entity: ENTITY = new this.Entity(payload.create);

          if (!entity.isEntity()) {
            return;
          }

          this.collection.set(entity.id, entity);
          this.collectionDidUpdate([entity]);
          this.emit(Repository.events.update, [entity]);

          return entity;
        }

        if (isArray(payload.bulkCreate)) {
          const entities: ENTITY[] = [];

          for (const create of payload.bulkCreate) {
            const entity: ENTITY = new this.Entity(create);

            if (!entity.isEntity()) {
              return;
            }

            this.collection.set(entity.id, entity);

            entities.push(entity);
          }

          this.collectionDidUpdate(entities);
          this.emit(Repository.events.update, entities);

          return entities;
        }

        if (isObject(payload.update)) {
          const entity: ENTITY = new this.Entity(payload.update);

          if (!entity.isEntity()) {
            return;
          }

          this.collection.set(entity.id, entity);
          this.collectionDidUpdate([entity]);
          this.emit(Repository.events.update, [entity]);

          return entity;
        }

        if (isArray(payload.bulkUpdate)) {
          const entities: ENTITY[] = [];

          for (const update of payload.bulkUpdate) {
            const entity: ENTITY = new this.Entity(update);

            if (!entity.isEntity()) {
              return;
            }

            this.collection.set(entity.id, entity);

            entities.push(entity);
          }

          this.collectionDidUpdate(entities);
          this.emit(Repository.events.update, entities);

          return entities;
        }

        if (isObject(payload.remove)) {
          const entity = this.collection.get(payload.remove.id);

          if (!entity) {
            return;
          }

          this.collection.delete(payload.remove.id);

          this.collectionDidRemove([entity]);
          this.emit(Repository.events.remove, [entity]);

          return entity;
        }

        throw new Error("Unknown type of payload");
      }
    } catch (error) {
      console.error(`ReceiveMessage (${this.constructor.name}) failed: ${getErrorMessage(error)}`);
    }
  }

  protected start(): void {
    runInAction(`Start pending for (${this.constructor.name})`, () => (this.pending = true));
  }

  protected stop(): void {
    runInAction(`Stop pending for (${this.constructor.name})`, () => (this.pending = false));
  }

  protected destroy(): void {
    runInAction(`${this.constructor.name}.destroy`, () => {
      this.isInit = false;
      this.pending = false;
      this.collection.clear();

      this.collectionDestroyed();
      this.emit(Repository.events.destroy, []);
    });
  }

  protected filter(list: ENTITY[]): ENTITY[] {
    return list;
  }

  protected repositoryDidInit(entity: Array<ENTITY | void>): void {
    // ! HOOK FOR REPOSITORY INIT
  }

  protected collectionDidUpdate(entity: Array<ENTITY | void>): void {
    // ! HOOK FOR COLLECTION UPDATE
  }

  protected collectionDidRemove(entity: Array<ENTITY | void>): void {
    // ! HOOK FOR REMOVE ITEMS FROM COLLECTION
  }
  protected collectionDestroyed(): void {
    // ! HOOK FOR DESTROY
  }

  private async handleUserBindedToConnection(): Promise<void> {
    try {
      await this.httpTransport.subscribeToChannel();

      this.ws.on(wsEventEnum.MESSAGE_RECEIVE, this.receiveMessage);

      console.info(`The user is linked to the connection successfully (${this.constructor.name})`);
    } catch (error) {
      console.error(
        `The user is linked to the connection failed ` +
          `(${this.constructor.name}): ${getErrorMessage(error)}`,
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
        `The user is unlinked to the connection failed` +
          ` (${this.constructor.name}): ${getErrorMessage(error)}`,
      );
    }
  }
}

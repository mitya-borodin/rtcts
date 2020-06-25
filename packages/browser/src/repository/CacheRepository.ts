import { Entity } from "@rtcts/isomorphic";
import { getErrorMessage } from "@rtcts/utils";
import EventEmitter from "eventemitter3";
import { action, computed, observable, ObservableMap } from "mobx";

export class CacheRepository<
  ENTITY extends Entity<DATA, VA>,
  DATA,
  VA extends object = object
> extends EventEmitter {
  public static events = {
    set: `CacheRepository.event.set`,
    delete: `CacheRepository.event.delete`,
  };

  @observable
  protected collection: ObservableMap<string, ENTITY>;
  protected Entity: new (data?: any) => ENTITY;

  constructor(Entity: new (data?: any) => ENTITY) {
    super();

    // * DEPS
    this.Entity = Entity;

    // ! OBSERVABLE
    this.collection = observable.map();

    // * BINDINGS
    this.set = this.set.bind(this);
    this.delete = this.delete.bind(this);

    this.filter = this.filter.bind(this);

    this.destroy = this.destroy.bind(this);

    this.collectionDidSet = this.collectionDidSet.bind(this);
    this.collectionDidDelete = this.collectionDidDelete.bind(this);
  }

  @computed({ name: "CacheRepository.map" })
  get map(): ObservableMap<string, ENTITY> {
    return this.collection;
  }

  @computed({ name: "CacheRepository.list" })
  get list(): ENTITY[] {
    return this.filter(Array.from(this.collection.values()));
  }

  @action("CacheRepository.set")
  public set(items: ENTITY[]): void {
    try {
      const entities: ENTITY[] = [];

      for (const item of items) {
        if (item instanceof this.Entity && item.isEntity()) {
          this.collection.set(item.id, item);

          entities.push(item);
        }
      }

      this.collectionDidSet(entities);
      this.collectionDidUpdate(entities);
      this.emit(CacheRepository.events.set, entities);
    } catch (error) {
      console.error(`${this.constructor.name}.set error: ${getErrorMessage(error)}`);
    }
  }

  @action("CacheRepository.delete")
  public delete(ids: string[]): void {
    try {
      const entities: ENTITY[] = [];

      for (const id of ids) {
        const entity: ENTITY | void = this.collection.get(id);

        if (entity instanceof this.Entity && entity.isEntity()) {
          entities.push(entity);

          this.collection.delete(id);
        }
      }

      this.collectionDidDelete(entities);
      this.collectionDidUpdate(entities);
      this.emit(CacheRepository.events.delete, entities);
    } catch (error) {
      console.error(`${this.constructor.name}.delete error: ${getErrorMessage(error)}`);
    }
  }

  @action("CacheRepository.destroy")
  protected destroy(): void {
    this.collection.clear();
    this.collectionDidDestroy();
  }

  // ! For extends

  protected filter(list: ENTITY[]): ENTITY[] {
    return list;
  }

  protected collectionDidSet(entities: ENTITY[]): void {
    // ! HOOK FOR COLLECTION SET
  }

  protected collectionDidDelete(entities: ENTITY[]): void {
    // ! HOOK FOR COLLECTION DELETE
  }

  protected collectionDidUpdate(entities: ENTITY[]): void {
    // ! HOOK FOR COLLECTION UPDATE
  }

  protected collectionDidDestroy(): void {
    // ! HOOK FOR COLLECTION DESTROY
  }
}

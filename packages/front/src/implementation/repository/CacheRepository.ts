import { IForm } from "@borodindmitriy/interfaces";
import { EventEmitter } from "@borodindmitriy/isomorphic";
import { getErrorMessage, isString } from "@borodindmitriy/utils";
import { action, computed, observable, ObservableMap, runInAction } from "mobx";
import { ICacheRepository } from "../../interfaces/repository/ICacheRepository";

// tslint:disable: object-literal-sort-keys

export class CacheRepository<T extends IForm> extends EventEmitter implements ICacheRepository<T> {
  public static events = {
    update: `[ Repository ][ UPDATE ]`,
    remove: `[ Repository ][ REMOVE ]`,
  };

  @observable
  protected collection: ObservableMap<string, T>;
  protected Entity: new (...args: any[]) => T;

  constructor(Entity: new (...args: any[]) => T) {
    super();

    // * DEPS
    this.Entity = Entity;

    // ! OBSERVABLE
    runInAction(`[ ${this.constructor.name} ][ SET_INITIAL_VALUE ]`, () => (this.collection = observable.map()));

    // * BINDINGS
    this.update = this.update.bind(this);
    this.remove = this.remove.bind(this);
    this.destroy = this.destroy.bind(this);
    this.filter = this.filter.bind(this);
    this.collectionDidUpdate = this.collectionDidUpdate.bind(this);
    this.collectionDidRemove = this.collectionDidRemove.bind(this);
  }

  @computed({ name: "[ CACHE ][ REPOSITORY ][ MAP ]" })
  get map(): ObservableMap<string, T> {
    return this.collection;
  }

  @computed({ name: "[ CACHE ][ REPOSITORY ][ LIST ]" })
  get list(): T[] {
    const list: T[] = [];

    for (const value of this.collection.values()) {
      list.push(value);
    }

    return this.filter(list);
  }

  @action("[ CACHE ][ REPOSITORY ][ UPDATE ]")
  public update(items: T[]): void {
    try {
      const entities: T[] = [];

      for (const item of items) {
        if (item instanceof this.Entity && isString(item.id)) {
          this.collection.set(item.id, item);
          entities.push(item);
        }
      }

      this.collectionDidUpdate(entities);
      this.emit(CacheRepository.events.update, entities);
    } catch (error) {
      console.error(`[ ${this.constructor.name} ][ UPDATE ][ ${getErrorMessage(error)} ]`);
    }
  }

  @action("[ CACHE ][ REPOSITORY ][ REMOVE ]")
  public remove(ids: string[]): void {
    try {
      const entities: T[] = [];

      for (const id of ids) {
        const entity: T | void = this.collection.get(id);

        if (entity instanceof this.Entity) {
          entities.push(entity);
          this.collection.delete(id);
        }
      }

      this.collectionDidRemove(entities);
      this.emit(CacheRepository.events.update, entities);
    } catch (error) {
      console.error(`[ ${this.constructor.name} ][ REMOVE ][ ${getErrorMessage(error)} ]`);
    }
  }

  @action("[ CACHE ][ REPOSITORY ][ DESTROY ]")
  protected destroy(): void {
    this.collection.clear();
    this.collectionDidDestroied();
  }

  protected filter(list: T[]): T[] {
    return list;
  }

  protected collectionDidUpdate(entities: T[]): void {
    // ! HOOK FOR COLLECTION UPDATE
  }

  protected collectionDidRemove(entities: T[]): void {
    // ! HOOK FOR COLLECTION UPDATE
  }

  protected collectionDidDestroied(): void {
    // ! HOOK FOR COLLECTION DESTROY
  }
}

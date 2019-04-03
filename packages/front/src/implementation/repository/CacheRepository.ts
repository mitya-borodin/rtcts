import { IEntity } from "@borodindmitriy/interfaces";
import { getErrorMessage } from "@borodindmitriy/utils";
import { action, computed, observable, ObservableMap, runInAction } from "mobx";
import { ICacheRepository } from "../../interfaces/repository/ICacheRepository";

export class CacheRepository<E extends IEntity> implements ICacheRepository<E> {
  @observable
  protected collection: ObservableMap<string, E>;

  protected Entity: new (data?: any) => E;

  constructor(Entity: new (data?: any) => E) {
    // * DEPS
    this.Entity = Entity;

    // ! OBSERVABLE
    runInAction(`[ ${this.constructor.name} ][ SET_INITIAL_VALUE ]`, () => {
      this.collection = observable.map();
    });

    // * BINDINGS
    this.update = this.update.bind(this);
    this.remove = this.remove.bind(this);
    this.destroy = this.destroy.bind(this);
    this.filter = this.filter.bind(this);
  }

  @computed({ name: "[ CACHE ][ REPOSITORY ][ MAP ]" })
  get map(): ObservableMap<string, E> {
    return this.collection;
  }

  @computed({ name: "[ CACHE ][ REPOSITORY ][ LIST ]" })
  get list(): E[] {
    const list: E[] = [];

    for (const value of this.collection.values()) {
      list.push(value);
    }

    return this.filter(list);
  }

  @action("[ CACHE ][ REPOSITORY ][ UPDATE ]")
  public update(entities: E[]): void {
    try {
      for (const entity of entities) {
        this.collection.set(entity.id, entity);
      }
    } catch (error) {
      console.error(`[ ${this.constructor.name} ][ UPDATE ][ ${getErrorMessage(error)} ]`);
    }
  }

  @action("[ CACHE ][ REPOSITORY ][ REMOVE ]")
  public remove(ids: string[]): void {
    try {
      for (const id of ids) {
        this.collection.delete(id);
      }
    } catch (error) {
      console.error(`[ ${this.constructor.name} ][ REMOVE ][ ${getErrorMessage(error)} ]`);
    }
  }

  @action("[ CACHE ][ REPOSITORY ][ DESTROY ]")
  protected destroy(): void {
    this.collection.clear();
  }

  protected filter(list: E[]): E[] {
    return list;
  }
}

import { Entity } from "@rtcts/isomorphic";
import { isObject } from "@rtcts/utils";
import { CollectionInsertOneOptions, FindOneAndReplaceOption, FindOneOptions } from "mongodb";
import { MongoDBRepository } from "./MongoDBRepository";

export class Model<E extends Entity<DATA, VA>, DATA, VA extends any[] = any[]> {
  protected readonly repository: MongoDBRepository;
  protected readonly Entity: new (data?: any) => E;
  protected readonly send: (
    payload: { [key: string]: any },
    uid: string,
    wsid: string,
    excludeCurrentDevice?: boolean,
  ) => void;

  constructor(
    repository: MongoDBRepository,
    Entity: new (data: any) => E,
    send: (
      payload: { [key: string]: any },
      uid: string,
      wsid: string,
      excludeCurrentDevice?: boolean,
    ) => void,
  ) {
    this.repository = repository;
    this.Entity = Entity;
    this.send = send;
  }

  public async read(query: object = {}, options?: FindOneOptions): Promise<E[]> {
    try {
      const items = await this.repository.find(
        query,
        isObject(options) && Object.keys(options).length > 0 ? options : undefined,
      );

      return items.map(this.makeEntity);
    } catch (error) {
      console.error(error);
    }

    return [];
  }

  public async readOne(query: object = {}, options?: FindOneOptions): Promise<E | null> {
    try {
      const item = await this.repository.findOne(
        query,
        isObject(options) && Object.keys(options).length > 0 ? options : undefined,
      );

      if (item) {
        return this.makeEntity(item);
      }
    } catch (error) {
      console.error(error);
    }

    return null;
  }

  public async readById(id: string, options?: FindOneOptions): Promise<E | null> {
    try {
      const result: object | null = await this.repository.findById(
        id,
        isObject(options) && Object.keys(options).length > 0 ? options : undefined,
      );

      if (result !== null) {
        return this.makeEntity(result);
      }
    } catch (error) {
      console.error(error);
    }

    return null;
  }

  public async getMap(query: object = {}, options?: FindOneOptions): Promise<Map<string, E>> {
    const map: Map<string, E> = new Map();

    try {
      const items: any[] = await this.read(
        query,
        isObject(options) && Object.keys(options).length > 0 ? options : undefined,
      );

      for (const item of items) {
        const entity = new this.Entity(item);

        if (entity.isEntity()) {
          map.set(entity.id, entity);
        }
      }
    } catch (error) {
      console.error(error);
    }

    return map;
  }

  public async create(
    data: object,
    uid: string,
    wsid: string,
    options?: CollectionInsertOneOptions,
    excludeCurrentDevice: boolean = true,
  ): Promise<E | null> {
    try {
      const insert = new this.Entity(data);

      if (insert.canBeInsert()) {
        const result: any = await this.repository.insertOne(insert, this.getOptions(options));
        const entity = new this.Entity(result);

        if (entity.isEntity()) {
          this.send({ create: entity.toObject() }, uid, wsid, excludeCurrentDevice);

          return entity;
        }
      }
    } catch (error) {
      console.error(error);
    }

    return null;
  }

  public async update(
    data: object,
    uid: string,
    wsid: string,
    options?: FindOneAndReplaceOption,
    excludeCurrentDevice: boolean = true,
  ): Promise<E | null> {
    try {
      let entity = new this.Entity(data);

      if (entity.isEntity()) {
        const { id, ...$set } = entity.toObject();

        const result: object | null = await this.repository.findOneAndUpdate(
          { id },
          { $set },
          {
            returnOriginal: false,
            ...this.getOptions(options),
          },
        );

        if (result !== null) {
          entity = new this.Entity(result);

          if (entity.isEntity()) {
            this.send({ update: entity.toObject() }, uid, wsid, excludeCurrentDevice);

            return entity;
          }
        }
      }
    } catch (error) {
      console.error(error);
    }

    return null;
  }

  public async remove(
    id: string,
    uid: string,
    wsid: string,
    options?: { projection?: object; sort?: object },
    excludeCurrentDevice: boolean = true,
  ): Promise<E | null> {
    try {
      const result: object | null = await this.repository.findByIdAndRemove(
        id,
        this.getOptions(options),
      );

      if (result !== null) {
        const entity = new this.Entity(result);

        if (entity.isEntity()) {
          this.send({ remove: entity.toObject() }, uid, wsid, excludeCurrentDevice);

          return entity;
        }
      }
    } catch (error) {
      console.error(error);
    }

    return null;
  }

  protected makeEntity(data: any): E {
    const entity = new this.Entity(data);

    entity.isEntity();

    return entity;
  }

  protected getOptions(options?: object): object | undefined {
    return isObject(options) && Object.keys(options).length > 0 ? options : undefined;
  }
}

import { Entity, Send, ListResponse, Response, ValidateResult } from "@rtcts/isomorphic";
import { CollectionInsertOneOptions, FindOneAndReplaceOption, FindOneOptions } from "mongodb";
import { MongoDBRepository } from "./MongoDBRepository";

export class Model<E extends Entity<DATA, VA>, DATA, VA extends any[] = any[]> {
  protected readonly repository: MongoDBRepository<E, DATA, VA>;
  protected readonly Entity: new (data: any) => E;
  protected readonly send: Send;

  constructor(
    repository: MongoDBRepository<E, DATA, VA>,
    Entity: new (data: any) => E,
    send: Send,
  ) {
    this.repository = repository;
    this.Entity = Entity;
    this.send = send;
  }

  // ! Response API

  public async getListResponse(offset = 0, limit = 20): Promise<ListResponse> {
    const results: E[] = await this.repository.find({}, offset, limit);

    return new ListResponse({
      count: results.length,
      results: results.map((item) => item.toJSON()),
      validates: new ValidateResult(),
    });
  }

  public async getItemResponse(id: string, options?: FindOneOptions): Promise<Response> {
    const result: E | null = await this.repository.findById(id, options);

    return new Response({
      result: result !== null ? result.toJSON() : result,
      validates: new ValidateResult(),
    });
  }

  public async createResponse(
    data: object,
    uid: string,
    wsid: string,
    options?: CollectionInsertOneOptions,
    excludeCurrentDevice: boolean = true,
  ): Promise<Response> {
    const result: E | null = await this.create(data, uid, wsid, options, excludeCurrentDevice);

    return new Response({
      result: result !== null ? result.toJSON() : result,
      validates: new ValidateResult(),
    });
  }

  public async updateResponse(
    data: object,
    uid: string,
    wsid: string,
    options?: CollectionInsertOneOptions,
    excludeCurrentDevice: boolean = true,
  ): Promise<Response> {
    const result: E | null = await this.update(data, uid, wsid, options, excludeCurrentDevice);

    return new Response({
      result: result !== null ? result.toJSON() : result,
      validates: new ValidateResult(),
    });
  }

  public async removeResponse(
    id: string,
    uid: string,
    wsid: string,
    options?: { projection?: object; sort?: object },
    excludeCurrentDevice: boolean = true,
  ): Promise<Response> {
    const result: E | null = await this.remove(id, uid, wsid, options, excludeCurrentDevice);

    return new Response({
      result: result !== null ? result.toJSON() : result,
      validates: new ValidateResult(),
    });
  }

  // ! Model API

  public async getMap(offset = 0, limit = 20): Promise<Map<string, E>> {
    const map: Map<string, E> = new Map();

    try {
      const items: E[] = await this.repository.find({}, offset, limit);

      for (const item of items) {
        if (item.isEntity()) {
          map.set(item.id, item);
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
        const result: E | null = await this.repository.insertOne(insert, options);

        if (result) {
          this.send({ create: result.toObject() }, uid, wsid, excludeCurrentDevice);

          return result;
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
      const entity = new this.Entity(data);

      if (entity.isEntity()) {
        const { id, ...$set } = entity.toObject();
        const result: E | null = await this.repository.findOneAndUpdate(
          { id },
          { $set },
          {
            returnOriginal: false,
            ...options,
          },
        );

        if (result !== null) {
          this.send({ update: result.toObject() }, uid, wsid, excludeCurrentDevice);

          return result;
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
      const result: E | null = await this.repository.findByIdAndRemove(id, options);

      if (result !== null) {
        this.send({ remove: result.toObject() }, uid, wsid, excludeCurrentDevice);

        return result;
      }
    } catch (error) {
      console.error(error);
    }

    return null;
  }
}

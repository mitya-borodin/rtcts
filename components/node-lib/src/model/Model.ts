/* eslint-disable @typescript-eslint/no-explicit-any */
import { Entity, Send, ListResponse, Response, ValidateResult } from "@rtcts/isomorphic";
import { CollectionInsertOneOptions, FindOneAndReplaceOption, FindOneOptions } from "mongodb";
import { MongoDBRepository } from "./MongoDBRepository";

export class Model<ENTITY extends Entity<DATA, VA>, DATA, VA extends object = object> {
  protected readonly repository: MongoDBRepository<ENTITY, DATA, VA>;
  protected readonly Entity: new (data?: any) => ENTITY;
  protected readonly sendThroughWebSocket: Send;

  constructor(
    repository: MongoDBRepository<ENTITY, DATA, VA>,
    Entity: new (data?: any) => ENTITY,
    sendThroughWebSocket: Send,
  ) {
    this.repository = repository;
    this.Entity = Entity;
    this.sendThroughWebSocket = sendThroughWebSocket;
  }

  // ! Response API

  public async getListResponse(offset = 0, limit = 20): Promise<ListResponse> {
    const results: ENTITY[] = await this.repository.find({}, offset, limit);

    return new ListResponse({
      count: results.length,
      results: results.map((item) => item.toJSON()),
      validates: new ValidateResult(),
    });
  }

  public async getItemResponse(id: string, options?: FindOneOptions): Promise<Response> {
    const result: ENTITY | null = await this.repository.findById(id, options);

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
    excludeCurrentDevice = true,
  ): Promise<Response> {
    const result: ENTITY | null = await this.create(data, uid, wsid, options, excludeCurrentDevice);

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
    excludeCurrentDevice = true,
  ): Promise<Response> {
    const result: ENTITY | null = await this.update(data, uid, wsid, options, excludeCurrentDevice);

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
    excludeCurrentDevice = true,
  ): Promise<Response> {
    const result: ENTITY | null = await this.remove(id, uid, wsid, options, excludeCurrentDevice);

    return new Response({
      result: result !== null ? result.toJSON() : result,
      validates: new ValidateResult(),
    });
  }

  // ! Model API

  public async getMap(offset = 0, limit = 20): Promise<Map<string, ENTITY>> {
    const map: Map<string, ENTITY> = new Map();

    try {
      const items: ENTITY[] = await this.repository.find({}, offset, limit);

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
    excludeCurrentDevice = true,
  ): Promise<ENTITY | null> {
    try {
      const insert = new this.Entity(data);

      if (insert.canBeInsert()) {
        const result: ENTITY | null = await this.repository.insertOne(insert, options);

        if (result) {
          this.sendThroughWebSocket({ create: result.toObject() }, uid, wsid, excludeCurrentDevice);

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
    excludeCurrentDevice = true,
  ): Promise<ENTITY | null> {
    try {
      const entity = new this.Entity(data);

      if (entity.isEntity()) {
        const { id, ...$set } = entity.toObject();
        const result: ENTITY | null = await this.repository.findOneAndUpdate(
          { id },
          { $set },
          {
            returnOriginal: false,
            ...options,
          },
        );

        if (result !== null) {
          this.sendThroughWebSocket({ update: result.toObject() }, uid, wsid, excludeCurrentDevice);

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
    excludeCurrentDevice = true,
  ): Promise<ENTITY | null> {
    try {
      const result: ENTITY | null = await this.repository.findByIdAndRemove(id, options);

      if (result !== null) {
        this.sendThroughWebSocket({ remove: result.toObject() }, uid, wsid, excludeCurrentDevice);

        return result;
      }
    } catch (error) {
      console.error(error);
    }

    return null;
  }
}
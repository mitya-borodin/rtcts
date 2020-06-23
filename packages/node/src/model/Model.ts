/* eslint-disable @typescript-eslint/no-explicit-any */
import { Entity, ListResponse, Response, Send, ValidateResult } from "@rtcts/isomorphic";
import { MongoDBRepository } from "./MongoDBRepository";

export class Model<ENTITY extends Entity<DATA, VA>, DATA, VA extends object = object> {
  protected readonly Entity: new (data?: any) => ENTITY;
  protected readonly repository: MongoDBRepository<ENTITY, DATA, VA>;
  protected readonly sendThroughWebSocket: Send;

  constructor(
    Entity: new (data?: any) => ENTITY,
    repository: MongoDBRepository<ENTITY, DATA, VA>,
    sendThroughWebSocket: Send,
  ) {
    this.Entity = Entity;
    this.repository = repository;
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

  public async getItemResponse(id: string): Promise<Response> {
    const result: ENTITY | null = await this.repository.findById(id);

    return new Response({
      result: result !== null ? result.toJSON() : result,
      validates: new ValidateResult(),
    });
  }

  public async createResponse(
    data: object,
    uid: string,
    wsid: string,
    excludeRequestingDevice = true,
  ): Promise<Response> {
    const result: ENTITY | null = await this.create(data, uid, wsid, excludeRequestingDevice);

    return new Response({
      result: result !== null ? result.toJSON() : result,
      validates: new ValidateResult(),
    });
  }

  public async updateResponse(
    data: object,
    uid: string,
    wsid: string,
    excludeRequestingDevice = true,
  ): Promise<Response> {
    const result: ENTITY | null = await this.update(data, uid, wsid, excludeRequestingDevice);

    return new Response({
      result: result !== null ? result.toJSON() : result,
      validates: new ValidateResult(),
    });
  }

  public async removeResponse(
    id: string,
    uid: string,
    wsid: string,
    excludeRequestingDevice = true,
  ): Promise<Response> {
    const result: ENTITY | null = await this.remove(id, uid, wsid, excludeRequestingDevice);

    return new Response({
      result: result !== null ? result.toJSON() : result,
      validates: new ValidateResult(),
    });
  }

  // ! Model API
  public async getMap(offset = 0, limit = 25): Promise<Map<string, ENTITY>> {
    const map: Map<string, ENTITY> = new Map<string, ENTITY>();

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
    excludeRequestingDevice = true,
  ): Promise<ENTITY | null> {
    try {
      const insert = new this.Entity(data);

      if (insert.canBeInsert()) {
        const entity: ENTITY | null = await this.repository.insertOne(insert);

        if (entity) {
          this.sendThroughWebSocket(
            { create: entity.toObject() },
            uid,
            wsid,
            excludeRequestingDevice,
          );

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
    excludeRequestingDevice = true,
  ): Promise<ENTITY | null> {
    try {
      const entity = new this.Entity(data);

      if (entity.isEntity()) {
        const result: ENTITY | null = await this.repository.findOneAndUpdate(entity);

        if (result !== null) {
          this.sendThroughWebSocket(
            { update: result.toObject() },
            uid,
            wsid,
            excludeRequestingDevice,
          );

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
    excludeRequestingDevice = true,
  ): Promise<ENTITY | null> {
    try {
      const result: ENTITY | null = await this.repository.findByIdAndRemove(id);

      if (result !== null) {
        this.sendThroughWebSocket(
          { remove: result.toObject() },
          uid,
          wsid,
          excludeRequestingDevice,
        );

        return result;
      }
    } catch (error) {
      console.error(error);
    }

    return null;
  }
}

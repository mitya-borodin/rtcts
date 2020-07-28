/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Entity, ListResponse, Response, Send, ValidationResult } from "@rtcts/isomorphic";
import { MongoDBRepository } from "./MongoDBRepository";

export class Model<ENTITY extends Entity> {
  protected readonly Entity: new (data: any) => ENTITY;
  protected readonly repository: MongoDBRepository<ENTITY>;
  protected readonly sendThroughWebSocket: Send;

  constructor(
    Entity: new (data?: any) => ENTITY,
    repository: MongoDBRepository<ENTITY>,
    sendThroughWebSocket: Send,
  ) {
    this.Entity = Entity;
    this.repository = repository;
    this.sendThroughWebSocket = sendThroughWebSocket;
  }

  // ! Response API
  public async getListResponse(offset = 0, limit = 20): Promise<ListResponse> {
    const payload: ENTITY[] = await this.repository.find({}, offset, limit);

    return new ListResponse({
      count: payload.length,
      payload: payload.map((item) => item.toJSON()),
      validationResult: new ValidationResult([]),
    });
  }

  public async getItemResponse(id: string): Promise<Response> {
    const payload: ENTITY | null = await this.repository.findById(id);

    return new Response({
      payload: payload !== null ? payload.toJSON() : payload,
      validationResult: new ValidationResult([]),
    });
  }

  public async createResponse(
    data: object,
    uid: string,
    wsid: string,
    excludeRequestingDevice = true,
  ): Promise<Response> {
    const payload: ENTITY | null = await this.create(data, uid, wsid, excludeRequestingDevice);

    return new Response({
      payload: payload !== null ? payload.toJSON() : payload,
      validationResult: new ValidationResult([]),
    });
  }

  public async updateResponse(
    data: object,
    uid: string,
    wsid: string,
    excludeRequestingDevice = true,
  ): Promise<Response> {
    const payload: ENTITY | null = await this.update(data, uid, wsid, excludeRequestingDevice);

    return new Response({
      payload: payload !== null ? payload.toJSON() : payload,
      validationResult: new ValidationResult([]),
    });
  }

  public async removeResponse(
    id: string,
    uid: string,
    wsid: string,
    excludeRequestingDevice = true,
  ): Promise<Response> {
    const payload: ENTITY | null = await this.remove(id, uid, wsid, excludeRequestingDevice);

    return new Response({
      payload: payload !== null ? payload.toJSON() : payload,
      validationResult: new ValidationResult([]),
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

      if (insert.isInsert()) {
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
        const payload: ENTITY | null = await this.repository.findOneAndUpdate(entity);

        if (payload !== null) {
          this.sendThroughWebSocket(
            { update: payload.toObject() },
            uid,
            wsid,
            excludeRequestingDevice,
          );

          return payload;
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
      const payload: ENTITY | null = await this.repository.findByIdAndRemove(id);

      if (payload !== null) {
        this.sendThroughWebSocket(
          { remove: payload.toObject() },
          uid,
          wsid,
          excludeRequestingDevice,
        );

        return payload;
      }
    } catch (error) {
      console.error(error);
    }

    return null;
  }
}

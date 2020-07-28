/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Entity, Response, Send, ValidationResult } from "@rtcts/isomorphic";
import { Collection } from "mongodb";
import { MongoDBRepository } from "./MongoDBRepository";

export class SingleObjectModel<ENTITY extends Entity> {
  protected readonly Entity: new (data: any) => ENTITY;
  protected readonly repository: MongoDBRepository<ENTITY>;
  protected readonly sendThroughWebSocket: Send;

  constructor(
    Entity: new (data: any) => ENTITY,
    repository: MongoDBRepository<ENTITY>,
    sendThroughWebSocket: Send,
  ) {
    this.Entity = Entity;
    this.repository = repository;
    this.sendThroughWebSocket = sendThroughWebSocket;
  }

  // ! Response API
  public async getItemResponse(): Promise<Response> {
    const payload: ENTITY | null = await this.getItem();

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

  // ! Model API
  public async getItem(): Promise<ENTITY | null> {
    try {
      return await this.repository.findOne({});
    } catch (error) {
      const collection: Collection<any> = await this.repository.getCollection();

      await collection.drop();

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
      const currentEntity: ENTITY | null = await this.getItem();

      if (currentEntity === null) {
        const insert: ENTITY = new this.Entity(data);

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
      } else {
        const entity: ENTITY = new this.Entity(data);

        if (entity.isEntity()) {
          const updatedEntity: ENTITY | null = await this.repository.findOneAndUpdate(entity);

          if (updatedEntity !== null) {
            this.sendThroughWebSocket(
              { update: updatedEntity.toObject() },
              uid,
              wsid,
              excludeRequestingDevice,
            );

            return updatedEntity;
          }
        }
      }
    } catch (error) {
      console.error(error);
    }

    return null;
  }
}

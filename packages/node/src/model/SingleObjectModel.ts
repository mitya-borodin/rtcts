/* eslint-disable @typescript-eslint/no-explicit-any */
import { Entity, Send, ValidateResult, Response } from "@rtcts/isomorphic";
import { isObject } from "@rtcts/utils";
import { Collection, FindOneAndReplaceOption } from "mongodb";
import { MongoDBRepository } from "./MongoDBRepository";

export class SingleObjectModel<ENTITY extends Entity<DATA, VA>, DATA, VA extends object = object> {
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

  public async getItemResponse(): Promise<Response> {
    const result: ENTITY | null = await this.getItem();

    return new Response({
      result: result !== null ? result.toJSON() : result,
      validates: new ValidateResult(),
    });
  }

  public async updateResponse(
    data: object,
    uid: string,
    wsid: string,
    options?: FindOneAndReplaceOption,
    excludeCurrentDevice = true,
  ): Promise<Response> {
    const result: ENTITY | null = await this.update(data, uid, wsid, options, excludeCurrentDevice);

    return new Response({
      result: result !== null ? result.toJSON() : result,
      validates: new ValidateResult(),
    });
  }

  // ! Model API

  public async getItem(): Promise<ENTITY | null> {
    try {
      return await this.repository.findOne({});
    } catch (error) {
      const collection: Collection<ENTITY> = await this.repository.getCollection();

      await collection.drop();

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
      const currentEntity: ENTITY | null = await this.getItem();

      if (currentEntity === null) {
        const insert: ENTITY = new this.Entity(data);

        if (insert.canBeInsert()) {
          const entity: ENTITY | null = await this.repository.insertOne(insert, options);

          if (entity) {
            this.sendThroughWebSocket(
              { create: entity.toObject() },
              uid,
              wsid,
              excludeCurrentDevice,
            );

            return entity;
          }
        }
      } else {
        const entity: ENTITY = new this.Entity(data);

        if (entity.isEntity()) {
          const { id: _id, ...$set } = entity.toObject();

          const updatedEntity: ENTITY | null = await this.repository.findOneAndUpdate(
            { _id },
            { $set },
            {
              returnOriginal: false,
              ...(isObject(options) ? options : {}),
            },
          );

          if (updatedEntity !== null) {
            this.sendThroughWebSocket(
              { update: updatedEntity.toObject() },
              uid,
              wsid,
              excludeCurrentDevice,
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

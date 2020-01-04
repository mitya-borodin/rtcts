import { Entity, Send } from "@rtcts/isomorphic";
import { isObject } from "@rtcts/utils";
import { Collection, FindOneAndReplaceOption } from "mongodb";
import { MongoDBRepository } from "./MongoDBRepository";

export class SingleModel<E extends Entity<DATA, VA>, DATA, VA extends any[] = any[]> {
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

  public async read(): Promise<E | null> {
    try {
      return await this.repository.findOne({});
    } catch (error) {
      const collection: Collection<E> = await this.repository.getCollection();

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
    excludeCurrentDevice: boolean = true,
  ): Promise<E | null> {
    try {
      const currentEntity: E | null = await this.read();

      if (currentEntity === null) {
        const insert: E = new this.Entity(data);

        if (insert.canBeInsert()) {
          const entity: E | null = await this.repository.insertOne(insert, options);

          if (entity) {
            this.send({ create: entity.toObject() }, uid, wsid, excludeCurrentDevice);

            return entity;
          }
        }
      } else {
        const entity: E = new this.Entity(data);

        if (entity.isEntity()) {
          const { id: _id, ...$set } = entity.toObject();

          const updatedEntity: E | null = await this.repository.findOneAndUpdate(
            { _id },
            { $set },
            {
              returnOriginal: false,
              ...(isObject(options) ? options : {}),
            },
          );

          if (updatedEntity !== null) {
            this.send({ update: updatedEntity.toObject() }, uid, wsid, excludeCurrentDevice);

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

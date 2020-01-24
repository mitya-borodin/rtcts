/* eslint-disable @typescript-eslint/no-explicit-any */
import { Entity, ValueObject } from "@rtcts/isomorphic";
import { isObject } from "@rtcts/utils";
import { ObjectId } from "bson";
import omit from "lodash.omit";
import {
  AggregationCursor,
  Collection,
  CollectionCreateOptions,
  CollectionInsertManyOptions,
  CollectionInsertOneOptions,
  CommonOptions,
  Db,
  FindAndModifyWriteOpResultObject,
  FindOneAndReplaceOption,
  FindOneOptions,
  InsertOneWriteOpResult,
  InsertWriteOpResult,
  ReplaceOneOptions,
} from "mongodb";
import { MongoDBConnection } from "./MongoDBConnection";

export class MongoDBRepository<E extends Entity<DATA, VA>, DATA, VA extends any[] = any[]> {
  private readonly name: string;
  private readonly db: MongoDBConnection;
  private readonly options?: CollectionCreateOptions;
  private collection?: Collection;

  protected readonly Entity: new (data?: any) => E;

  constructor(
    name: string,
    db: MongoDBConnection,
    Entity: new (data: any) => E,
    options?: CollectionCreateOptions,
  ) {
    this.name = name;
    this.db = db;
    this.Entity = Entity;
    this.options = options;

    this.createEntity = this.createEntity.bind(this);
  }

  public async getCollection(): Promise<Collection<any>> {
    const db: Db = await this.db.getDB();

    if (!this.collection) {
      this.collection = await db.createCollection<any>(this.name, this.options);
    }

    await this.onValidation();

    return this.collection;
  }

  public async onValidation(): Promise<void> {
    try {
      const db: Db = await this.db.getDB();

      if (this.options) {
        await db.command({
          collMod: this.name,
          validationAction: this.options.validationAction || "error",
          validationLevel: this.options.validationLevel || "strict",
          validator: this.options.validator || {},
        });
      }
    } catch (error) {
      console.error(error);
    }
  }

  public async offValidation(): Promise<void> {
    try {
      const db: Db = await this.db.getDB();

      await db.command({ collMod: this.name, validationLevel: "off" });
    } catch (error) {
      console.error(error);
    }
  }

  public async insertMany(
    items: ValueObject<DATA>[],
    options?: CollectionInsertManyOptions,
  ): Promise<E[]> {
    try {
      const collection: Collection<any> = await this.getCollection();

      const insert: InsertWriteOpResult<any> = await collection.insertMany(
        items
          .filter((item: ValueObject<DATA>) => item.canBeInsert())
          .map((item) => this.removeID(item.toObject())),
        this.getOptions(options),
      );

      return insert.ops.map(this.createEntity);
    } catch (error) {
      console.error(error);
    }

    return [];
  }

  public async insertOne(
    item: ValueObject<DATA>,
    options?: CollectionInsertOneOptions,
  ): Promise<E | null> {
    try {
      if (item.canBeInsert()) {
        const collection: Collection<any> = await this.getCollection();

        const insert: InsertOneWriteOpResult<any> = await collection.insertOne(
          this.removeID(item.toObject()),
          this.getOptions(options),
        );

        return insert.ops.map((item: any) => this.createEntity(item))[0];
      }
    } catch (error) {
      console.error(error);
    }

    return null;
  }

  // https://docs.mongodb.com/manual/tutorial/query-documents/
  public async find(query: object, offset = 0, limit = 20, options?: FindOneOptions): Promise<E[]> {
    try {
      const collection: Collection<any> = await this.getCollection();

      const cursor: AggregationCursor = collection.aggregate([
        {
          $skip: offset,
          $limit: limit,
          $match: this.normalizeObjectID(query),
        },
        ...(options ? [{ $project: { _id: true, ...options.projection } }] : []),
      ]);

      const items = await cursor.toArray();

      return items.map(this.createEntity);
    } catch (error) {
      console.error(error);
    }

    return [];
  }

  // https://docs.mongodb.com/manual/tutorial/query-documents/
  public async findOne(query: object, options?: FindOneOptions): Promise<E | null> {
    try {
      const collection: Collection = await this.getCollection();
      const item: object | null = await collection.findOne(
        this.normalizeObjectID(query),
        this.getOptions(options),
      );

      if (item !== null) {
        return this.createEntity(item);
      }
    } catch (error) {
      console.error(error);
    }

    return null;
  }

  public async findById(id: string, options?: FindOneOptions): Promise<E | null> {
    try {
      const item: object | null = await this.findOne(
        { _id: new ObjectId(id) },
        this.getOptions(options),
      );

      if (item) {
        return this.createEntity(item);
      }
    } catch (error) {
      console.error(error);
    }

    return null;
  }

  // https://docs.mongodb.com/manual/tutorial/query-documents/
  public async findOneAndUpdate(
    query: object,
    update: object,
    options?: FindOneAndReplaceOption,
  ): Promise<E | null> {
    try {
      const collection: Collection<any> = await this.getCollection();
      const result: FindAndModifyWriteOpResultObject = await collection.findOneAndUpdate(
        this.normalizeObjectID(query),
        this.removeID(update),
        this.getOptions(options),
      );

      if (result.ok === 1 && result.value) {
        return this.createEntity(result.value);
      }
    } catch (error) {
      console.error(error);
    }

    return null;
  }

  // https://docs.mongodb.com/manual/tutorial/query-documents/
  public async findOneAndRemove(
    query: object,
    options?: { projection?: object; sort?: object },
  ): Promise<E | null> {
    try {
      const collection: Collection<any> = await this.getCollection();

      const result: FindAndModifyWriteOpResultObject = await collection.findOneAndDelete(
        this.normalizeObjectID(query),
        this.getOptions(options),
      );

      if (result.ok === 1 && result.value) {
        return this.createEntity(result.value);
      }
    } catch (error) {
      console.error(error);
    }

    return null;
  }

  public async findByIdAndRemove(
    id: string,
    options?: { projection?: object; sort?: object },
  ): Promise<E | null> {
    try {
      return await this.findOneAndRemove({ _id: new ObjectId(id) }, this.getOptions(options));
    } catch (error) {
      console.error(error);
    }

    return null;
  }

  public async updateOne(
    query: object,
    update: object,
    options?: ReplaceOneOptions,
  ): Promise<void> {
    try {
      const collection: Collection<any> = await this.getCollection();

      await collection.updateOne(this.normalizeObjectID(query), this.removeID(update), options);
    } catch (error) {
      console.error(error);
    }
  }

  // https://docs.mongodb.com/manual/tutorial/query-documents/
  public async updateMany(
    query: object,
    update: object,
    options?: ReplaceOneOptions,
  ): Promise<void> {
    try {
      const collection: Collection<any> = await this.getCollection();

      await collection.updateMany(this.normalizeObjectID(query), this.removeID(update), options);
    } catch (error) {
      console.error(error);
    }
  }

  // https://docs.mongodb.com/manual/tutorial/query-documents/
  public async deleteOne(query: object, options?: CommonOptions): Promise<void> {
    try {
      const collection: Collection<any> = await this.getCollection();

      await collection.deleteOne(this.normalizeObjectID(query), options);
    } catch (error) {
      console.error(error);
    }
  }

  // https://docs.mongodb.com/manual/tutorial/query-documents/
  public async deleteMany(query: object, options?: CommonOptions): Promise<void> {
    try {
      const collection: Collection<any> = await this.getCollection();

      await collection.deleteMany(this.normalizeObjectID(query), options);
    } catch (error) {
      console.error(error);
    }
  }

  private normalizeObjectID(data: any): any {
    if (ObjectId.isValid(data._id)) {
      return { ...data, _id: new ObjectId(data._id) };
    }

    if (ObjectId.isValid(data.id)) {
      return { ...data, _id: new ObjectId(data.id) };
    }

    throw new Error("The incoming object does not contain a suitable ObjectID");
  }

  private createEntity({ _id, ...data }: { [key: string]: any }): E {
    if (ObjectId.isValid(_id)) {
      const entity = new this.Entity({ ...data, id: _id.toHexString() });

      if (entity.isEntity()) {
        return entity;
      }
    }

    throw new Error("The incoming object does not contain a suitable ObjectID");
  }

  private removeID(data: any): any {
    return omit(data, ["id", "_id"]);
  }

  protected getOptions(options?: object): object | undefined {
    return isObject(options) && Object.keys(options).length > 0 ? options : undefined;
  }
}

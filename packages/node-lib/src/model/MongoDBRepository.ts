/* eslint-disable no-underscore-dangle */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Entity, ValueObject } from "@rtcts/isomorphic";
import { isObject } from "@rtcts/utils";
import { ObjectId } from "bson";
import omit from "lodash.omit";
import {
  Collection,
  CollectionCreateOptions,
  CollectionInsertManyOptions,
  CollectionInsertOneOptions,
  CommonOptions,
  Db,
  FilterQuery,
  FindAndModifyWriteOpResultObject,
  FindOneAndReplaceOption,
  FindOneOptions,
  InsertOneWriteOpResult,
  InsertWriteOpResult,
  ReplaceOneOptions,
  FindOneAndDeleteOption,
  UpdateQuery,
} from "mongodb";
import { MongoDBConnection } from "./MongoDBConnection";

export class MongoDBRepository<ENTITY extends Entity<DATA, VA>, DATA, VA extends object = object> {
  private readonly name: string;
  private readonly db: MongoDBConnection;
  private readonly options?: CollectionCreateOptions;
  private collection?: Collection;

  protected readonly Entity: new (data?: any) => ENTITY;

  constructor(
    name: string,
    db: MongoDBConnection,
    Entity: new (data?: any) => ENTITY,
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
  ): Promise<ENTITY[]> {
    try {
      const collection: Collection<any> = await this.getCollection();

      const insert: InsertWriteOpResult = await collection.insertMany(
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
  ): Promise<ENTITY | null> {
    try {
      if (item.canBeInsert()) {
        const collection: Collection<any> = await this.getCollection();

        const insert: InsertOneWriteOpResult = await collection.insertOne(
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
  public async find(
    query: FilterQuery<DATA>,
    offset = 0,
    limit = 20,
    options?: FindOneOptions,
  ): Promise<ENTITY[]> {
    try {
      const collection: Collection<any> = await this.getCollection();

      const cursor = collection
        .find(this.normalizeObjectID(query), this.getOptions(options))
        .skip(offset)
        .limit(limit);

      const items = await cursor.toArray();

      return items.map(this.createEntity);
    } catch (error) {
      console.error(error);
    }

    return [];
  }

  // https://docs.mongodb.com/manual/tutorial/query-documents/
  public async findOne(query: FilterQuery<DATA>, options?: FindOneOptions): Promise<ENTITY | null> {
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

  public async findById(id: string, options?: FindOneOptions): Promise<ENTITY | null> {
    try {
      const item: ENTITY | null = await this.findOne(
        { _id: new ObjectId(id) },
        this.getOptions(options),
      );

      if (item) {
        return item;
      }
    } catch (error) {
      console.error(error);
    }

    return null;
  }

  // https://docs.mongodb.com/manual/tutorial/query-documents/
  public async findOneAndUpdate(
    query: FilterQuery<DATA>,
    update: UpdateQuery<DATA>,
    options?: FindOneAndReplaceOption,
  ): Promise<ENTITY | null> {
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
    query: FilterQuery<DATA>,
    options?: FindOneAndDeleteOption,
  ): Promise<ENTITY | null> {
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
    options?: FindOneAndDeleteOption,
  ): Promise<ENTITY | null> {
    try {
      return await this.findOneAndRemove({ _id: new ObjectId(id) }, this.getOptions(options));
    } catch (error) {
      console.error(error);
    }

    return null;
  }

  public async updateOne(
    query: FilterQuery<DATA>,
    update: UpdateQuery<DATA>,
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
    query: FilterQuery<DATA>,
    update: UpdateQuery<DATA>,
    options?: ReplaceOneOptions,
  ): Promise<void> {
    try {
      const collection: Collection<any> = await this.getCollection();

      await collection.updateMany(query, update, options);
    } catch (error) {
      console.error(error);
    }
  }

  // https://docs.mongodb.com/manual/tutorial/query-documents/
  public async deleteOne(query: FilterQuery<DATA>, options?: CommonOptions): Promise<void> {
    try {
      const collection: Collection<any> = await this.getCollection();

      await collection.deleteOne(this.normalizeObjectID(query), options);
    } catch (error) {
      console.error(error);
    }
  }

  // https://docs.mongodb.com/manual/tutorial/query-documents/
  public async deleteMany(query: FilterQuery<DATA>, options?: CommonOptions): Promise<void> {
    try {
      const collection: Collection<any> = await this.getCollection();

      await collection.deleteMany(query, options);
    } catch (error) {
      console.error(error);
    }
  }

  private normalizeObjectID(data: any): any {
    if (ObjectId.isValid(data._id)) {
      const { _id, ...other } = data;

      return { ...other, _id: new ObjectId(_id) };
    }

    if (ObjectId.isValid(data.id)) {
      const { id, ...other } = data;

      return { ...other, _id: new ObjectId(id) };
    }

    if (isObject(data._id) || isObject(data.id)) {
      return data;
    }

    if (data._id || data.id) {
      throw new Error("The incoming object does not contain a suitable ObjectID");
    }

    return data;
  }

  private createEntity({ _id, ...data }: { [key: string]: any }): ENTITY {
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
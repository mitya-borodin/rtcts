import { ValueObject } from "@rtcts/isomorphic";
import { ObjectId } from "bson";
import omit from "lodash.omit";
import {
  AggregationCursor,
  Collection,
  CollectionCreateOptions,
  CollectionInsertManyOptions,
  CollectionInsertOneOptions,
  CommonOptions,
  Cursor,
  Db,
  FindAndModifyWriteOpResultObject,
  FindOneAndReplaceOption,
  FindOneOptions,
  InsertOneWriteOpResult,
  InsertWriteOpResult,
  ReplaceOneOptions,
} from "mongodb";
import { MongoDBConnection } from "./MongoDBConnection";

export class MongoDBRepository {
  private readonly name: string;
  private readonly db: MongoDBConnection;
  private readonly options?: CollectionCreateOptions;
  private collection?: Collection;

  constructor(name: string, db: MongoDBConnection, options?: CollectionCreateOptions) {
    this.name = name;
    this.db = db;
    this.options = options;
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
    items: ValueObject<any>[],
    options?: CollectionInsertManyOptions,
  ): Promise<any[]> {
    try {
      const collection: Collection<any> = await this.getCollection();
      const insert: InsertWriteOpResult<any> = await collection.insertMany(
        items
          .filter((item: ValueObject<any>) => item.canBeInsert())
          .map((item) => this.removeID(item.toObject())),
        options,
      );

      return insert.ops.map(this.objectIDtoEntityID);
    } catch (error) {
      console.error(error);
    }

    return [];
  }

  public async insertOne(
    item: ValueObject<any>,
    options?: CollectionInsertOneOptions,
  ): Promise<any> {
    try {
      if (item.canBeInsert()) {
        const collection: Collection<any> = await this.getCollection();
        const insert: InsertOneWriteOpResult<any> = await collection.insertOne(
          this.removeID(item.toObject()),
          options,
        );

        return insert.ops.map((data: any) => this.objectIDtoEntityID(data))[0];
      }
    } catch (error) {
      console.error(error);
    }
  }

  // https://docs.mongodb.com/manual/tutorial/query-documents/
  public async find(query: object, options?: FindOneOptions): Promise<any[]> {
    try {
      const collection: Collection<any> = await this.getCollection();

      if (options) {
        const $project = { _id: true, ...options.projection };
        const cursor: AggregationCursor = collection.aggregate([
          { $match: this.adjustmentObjectID(query) },
          { $project },
        ]);

        const items = await cursor.toArray();

        return items.map(this.objectIDtoEntityID);
      } else {
        const cursor: Cursor = await collection.find(this.adjustmentObjectID(query));
        const items = await cursor.toArray();

        return items.map(this.objectIDtoEntityID);
      }
    } catch (error) {
      console.error(error);
    }

    return [];
  }

  // https://docs.mongodb.com/manual/tutorial/query-documents/
  public async findOne(query: object, options?: FindOneOptions): Promise<object | null> {
    try {
      const collection: Collection = await this.getCollection();
      const item: any = await collection.findOne(this.adjustmentObjectID(query), options);

      if (item !== null) {
        return this.objectIDtoEntityID(item);
      }
    } catch (error) {
      console.error(error);
    }

    return null;
  }

  public async findById(id: string, options?: FindOneOptions): Promise<object | null> {
    try {
      const result = await this.findOne({ _id: new ObjectId(id) }, options);

      if (result) {
        return this.objectIDtoEntityID(result);
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
  ): Promise<object | null> {
    try {
      const collection: Collection<any> = await this.getCollection();
      const result: FindAndModifyWriteOpResultObject = await collection.findOneAndUpdate(
        this.adjustmentObjectID(query),
        this.removeID(update),
        options,
      );

      if (result.ok === 1 && result.value) {
        return this.objectIDtoEntityID(result.value);
      }

      return null;
    } catch (error) {
      console.error(error);

      return Promise.reject(error);
    }
  }

  // https://docs.mongodb.com/manual/tutorial/query-documents/
  public async findOneAndRemove(
    query: object,
    options?: { projection?: object; sort?: object },
  ): Promise<object | null> {
    try {
      const collection: Collection<any> = await this.getCollection();
      const result: FindAndModifyWriteOpResultObject = await collection.findOneAndDelete(
        this.adjustmentObjectID(query),
        options,
      );

      if (result.ok === 1 && result.value) {
        return this.objectIDtoEntityID(result.value);
      }
    } catch (error) {
      console.error(error);
    }

    return null;
  }

  public async findByIdAndRemove(
    id: string,
    options?: { projection?: object; sort?: object },
  ): Promise<object | null> {
    try {
      return await this.findOneAndRemove({ _id: new ObjectId(id) }, options);
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

      await collection.updateOne(this.adjustmentObjectID(query), this.removeID(update), options);
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

      await collection.updateMany(this.adjustmentObjectID(query), this.removeID(update), options);
    } catch (error) {
      console.error(error);
    }
  }

  // https://docs.mongodb.com/manual/tutorial/query-documents/
  public async deleteOne(query: object, options?: CommonOptions): Promise<void> {
    try {
      const collection: Collection<any> = await this.getCollection();

      await collection.deleteOne(this.adjustmentObjectID(query), options);
    } catch (error) {
      console.error(error);
    }
  }

  // https://docs.mongodb.com/manual/tutorial/query-documents/
  public async deleteMany(query: object, options?: CommonOptions): Promise<void> {
    try {
      const collection: Collection<any> = await this.getCollection();

      await collection.deleteMany(this.adjustmentObjectID(query), options);
    } catch (error) {
      console.error(error);
    }
  }

  private adjustmentObjectID(data: any): any {
    if (ObjectId.isValid(data._id)) {
      return { ...data, _id: new ObjectId(data._id) };
    }

    if (ObjectId.isValid(data.id)) {
      return { ...data, _id: new ObjectId(data.id) };
    }

    return data;
  }

  private objectIDtoEntityID({ _id, ...data }: { [key: string]: any }): any {
    if (ObjectId.isValid(_id)) {
      return { ...data, id: _id.toHexString() };
    }

    throw new Error("The identifier is not an ObjectId");
  }

  private removeID(data: any): any {
    return omit(data, ["id", "_id"]);
  }
}

import { ObjectId } from "bson";
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
import { isString } from "@borodindmitriy/utils";
import { IDBConnection } from "./interfaces/IDBConnection";
import { IRepository } from "./interfaces/IRepository";

export class MongoDBRepository<T, DBC extends IDBConnection<Db> = IDBConnection<Db>> implements IRepository<T> {
  private readonly name: string;
  private readonly db: DBC;
  private readonly options?: CollectionCreateOptions;
  private collection?: Collection;

  constructor(name: string, db: DBC, options?: CollectionCreateOptions) {
    this.name = name;
    this.options = options;
    this.db = db;
  }

  public async getCollection(): Promise<Collection<T>> {
    try {
      const db: Db = await this.db.getDB();

      if (!this.collection) {
        this.collection = await db.createCollection<T>(this.name, this.options);

        await this.onValidation();
      }

      await this.onValidation();

      return this.collection;
    } catch (error) {
      console.error(error);

      return Promise.reject(error);
    }
  }

  public async onValidation() {
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

      return Promise.reject(error);
    }
  }

  public async offValidation() {
    try {
      const db: Db = await this.db.getDB();

      await db.command({ collMod: this.name, validationLevel: "off" });
    } catch (error) {
      console.error(error);

      return Promise.reject(error);
    }
  }

  public prepareId(data: any): T {
    try {
      if (data._id) {
        return { ...data, id: data._id.toHexString() };
      }

      return data;
    } catch (error) {
      console.error(error);

      return data;
    }
  }

  public async insertMany(docs: object[], options?: CollectionInsertManyOptions): Promise<T[]> {
    try {
      const collection: Collection<T> = await this.getCollection();
      const insert: InsertWriteOpResult = await collection.insertMany(docs as any, options);

      return insert.ops.map((data: any) => this.prepareId(data));
    } catch (error) {
      console.error(error);

      return Promise.reject(error);
    }
  }

  public async insertOne(doc: object, options?: CollectionInsertOneOptions): Promise<T> {
    try {
      const collection: Collection<T> = await this.getCollection();
      const insert: InsertOneWriteOpResult = await collection.insertOne(doc as any, options);

      return insert.ops.map((data: any) => this.prepareId(data))[0];
    } catch (error) {
      console.error(error);

      return Promise.reject(error);
    }
  }

  public async find(query: object, options?: FindOneOptions): Promise<T[]> {
    try {
      const collection: Collection<T> = await this.getCollection();

      if (options) {
        const $project = { _id: true, ...options.projection };
        const cursor: AggregationCursor = collection.aggregate([{ $match: this.prepareObjectId(query) }, { $project }]);

        const items = await cursor.toArray();

        return items.map((data: any) => this.prepareId(data));
      } else {
        const cursor: Cursor = await collection.find(this.prepareObjectId(query));
        const items = await cursor.toArray();

        return items.map((data: any) => this.prepareId(data));
      }
    } catch (error) {
      console.error(error);

      return Promise.reject(error);
    }
  }

  public async findOne(query: object, options?: FindOneOptions): Promise<T | null> {
    try {
      const collection: Collection = await this.getCollection();
      const item = await collection.findOne(this.prepareObjectId(query), options);

      if (item !== null) {
        return this.prepareId(item);
      }

      return null;
    } catch (error) {
      console.error(error);

      return Promise.reject(error);
    }
  }

  public async findById(id: string, options?: FindOneOptions): Promise<T | null> {
    try {
      return await this.findOne({ _id: new ObjectId(id) }, options);
    } catch (error) {
      console.error(error);

      return Promise.reject(error);
    }
  }

  public async findOneAndUpdate(query: object, update: object, options?: FindOneAndReplaceOption): Promise<T | null> {
    try {
      const collection: Collection<T> = await this.getCollection();
      const result: FindAndModifyWriteOpResultObject = await collection.findOneAndUpdate(
        this.prepareObjectId(query),
        update,
        options,
      );

      if (result.ok === 1 && result.value) {
        return this.prepareId(result.value);
      }

      return null;
    } catch (error) {
      console.error(error);

      return Promise.reject(error);
    }
  }

  public async findOneAndRemove(query: object, options?: { projection?: object; sort?: object }): Promise<T | null> {
    try {
      const collection: Collection<T> = await this.getCollection();
      const result: FindAndModifyWriteOpResultObject = await collection.findOneAndDelete(
        this.prepareObjectId(query),
        options,
      );

      if (result.ok === 1 && result.value) {
        return this.prepareId(result.value);
      }

      return null;
    } catch (error) {
      console.error(error);

      return Promise.reject(error);
    }
  }

  public async findByIdAndRemove(id: string, options?: { projection?: object; sort?: object }): Promise<T | null> {
    try {
      return await this.findOneAndRemove({ _id: new ObjectId(id) }, options);
    } catch (error) {
      console.error(error);

      return Promise.reject(error);
    }
  }

  public async updateOne(query: object, update: object, options?: ReplaceOneOptions): Promise<void> {
    try {
      const collection: Collection<T> = await this.getCollection();

      await collection.updateOne(this.prepareObjectId(query), update, options);
    } catch (error) {
      console.error(error);

      return Promise.reject(error);
    }
  }

  public async updateMany(query: object, update: object, options?: ReplaceOneOptions): Promise<void> {
    try {
      const collection: Collection<T> = await this.getCollection();

      await collection.updateMany(this.prepareObjectId(query), update, options);
    } catch (error) {
      console.error(error);

      return Promise.reject(error);
    }
  }

  public async deleteOne(query: object, options?: CommonOptions): Promise<void> {
    try {
      const collection: Collection<T> = await this.getCollection();

      await collection.deleteOne(this.prepareObjectId(query), options);
    } catch (error) {
      console.error(error);

      return Promise.reject(error);
    }
  }

  public async deleteMany(query: object, options?: CommonOptions): Promise<void> {
    try {
      const collection: Collection<T> = await this.getCollection();

      await collection.deleteMany(this.prepareObjectId(query), options);
    } catch (error) {
      console.error(error);

      return Promise.reject(error);
    }
  }

  private prepareObjectId(data: any) {
    try {
      if (isString(data._id) && data._id.length === 24) {
        return { ...data, _id: new ObjectId(data._id) };
      }

      if (isString(data.id) && data.id.length === 24) {
        return { ...data, _id: new ObjectId(data.id) };
      }

      return data;
    } catch (error) {
      console.error(error);

      return data;
    }
  }
}

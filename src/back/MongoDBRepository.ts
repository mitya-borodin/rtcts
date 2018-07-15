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
import { isString } from "../utils/isType";
import { IDBConnection } from "./interfaces/IDBConnection";
import { IRepository } from "./interfaces/IRepository";

export class MongoDBRepository<D> implements IRepository<D> {
  private readonly name: string;
  private readonly db: IDBConnection;
  private readonly options?: CollectionCreateOptions;
  private collection?: Collection;

  constructor(name: string, db: IDBConnection, options?: CollectionCreateOptions) {
    this.name = name;
    this.options = options;
    this.db = db;
  }

  public async getCollection(): Promise<Collection<D>> {
    const db: Db = await this.db.getDB();

    if (!this.collection) {
      this.collection = await db.createCollection<D>(this.name, this.options);

      await this.onValidation();
    }

    await this.onValidation();

    return this.collection;
  }

  public async onValidation() {
    const db: Db = await this.db.getDB();

    if (this.options) {
      await db.command({
        collMod: this.name,
        validationAction: this.options.validationAction || "error",
        validationLevel: this.options.validationLevel || "strict",
        validator: this.options.validator || {},
      });
    }
  }

  public async offValidation() {
    const db: Db = await this.db.getDB();

    await db.command({ collMod: this.name, validationLevel: "off" });
  }

  public prepareId(data: any): D {
    if (data._id) {
      return { ...data, id: data._id.toHexString() };
    }

    return data;
  }

  public async insertMany(docs: object[], options?: CollectionInsertManyOptions): Promise<D[]> {
    const collection: Collection<D> = await this.getCollection();
    const insert: InsertWriteOpResult = await collection.insertMany(docs, options);

    return insert.ops.map((data: any) => this.prepareId(data));
  }

  public async insertOne(doc: object, options?: CollectionInsertOneOptions): Promise<D> {
    const collection: Collection<D> = await this.getCollection();
    const insert: InsertOneWriteOpResult = await collection.insertOne(doc, options);

    return insert.ops.map((data: any) => this.prepareId(data))[0];
  }

  public async find(query: object, options?: FindOneOptions): Promise<D[]> {
    const collection: Collection<D> = await this.getCollection();

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
  }

  public async findOne(query: object, options?: FindOneOptions): Promise<D | null> {
    const collection: Collection = await this.getCollection();
    const item = await collection.findOne(this.prepareObjectId(query), options);

    if (item !== null) {
      return this.prepareId(item);
    }

    return null;
  }

  public async findById(id: string, options?: FindOneOptions): Promise<D | null> {
    return await this.findOne({ _id: new ObjectId(id) }, options);
  }

  public async findOneAndUpdate(query: object, update: object, options?: FindOneAndReplaceOption): Promise<D | null> {
    const collection: Collection<D> = await this.getCollection();
    const result: FindAndModifyWriteOpResultObject = await collection.findOneAndUpdate(
      this.prepareObjectId(query),
      update,
      options,
    );

    if (result.ok === 1 && result.value) {
      return this.prepareId(result.value);
    }

    return null;
  }

  public async findOneAndRemove(query: object, options?: { projection?: object; sort?: object }): Promise<D | null> {
    const collection: Collection<D> = await this.getCollection();
    const result: FindAndModifyWriteOpResultObject = await collection.findOneAndDelete(
      this.prepareObjectId(query),
      options,
    );

    if (result.ok === 1 && result.value) {
      return this.prepareId(result.value);
    }

    return null;
  }

  public async findByIdAndRemove(id: string, options?: { projection?: object; sort?: object }): Promise<D | null> {
    return await this.findOneAndRemove({ _id: new ObjectId(id) }, options);
  }

  public async updateOne(query: object, update: object, options?: ReplaceOneOptions): Promise<void> {
    const collection: Collection<D> = await this.getCollection();

    await collection.updateOne(this.prepareObjectId(query), update, options);
  }

  public async updateMany(query: object, update: object, options?: ReplaceOneOptions): Promise<void> {
    const collection: Collection<D> = await this.getCollection();

    await collection.updateMany(this.prepareObjectId(query), update, options);
  }

  public async deleteOne(query: object, options?: CommonOptions): Promise<void> {
    const collection: Collection<D> = await this.getCollection();

    await collection.deleteOne(this.prepareObjectId(query), options);
  }

  public async deleteMany(query: object, options?: CommonOptions): Promise<void> {
    const collection: Collection<D> = await this.getCollection();

    await collection.deleteMany(this.prepareObjectId(query), options);
  }

  private prepareObjectId(data: any) {
    if (isString(data._id) && data._id.length === 24) {
      return { ...data, _id: new ObjectId(data._id) };
    }

    if (isString(data.id) && data.id.length === 24) {
      return { ...data, _id: new ObjectId(data.id) };
    }

    return data;
  }
}

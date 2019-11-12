/* eslint-disable @typescript-eslint/interface-name-prefix */
import {
  Collection,
  CollectionInsertManyOptions,
  CollectionInsertOneOptions,
  CommonOptions,
  FindOneAndReplaceOption,
  FindOneOptions,
  ReplaceOneOptions,
} from "mongodb";

export interface IRepository<T> {
  getCollection(): Promise<Collection<T>>;

  onValidation(): Promise<void>;

  offValidation(): Promise<void>;

  insertMany(docs: object[], options?: CollectionInsertManyOptions): Promise<T[]>;

  insertOne(doc: object, options?: CollectionInsertOneOptions): Promise<T>;

  find(query: object, options?: FindOneOptions): Promise<T[]>;

  updateOne(query: object, update: object, options?: ReplaceOneOptions): Promise<void>;

  updateMany(query: object, update: object, options?: ReplaceOneOptions): Promise<void>;

  findOne(query: object, options?: FindOneOptions): Promise<T | null>;

  findById(id: string, options?: FindOneOptions): Promise<T | null>;

  findOneAndUpdate(
    query: object,
    update: object,
    options?: FindOneAndReplaceOption,
  ): Promise<T | null>;

  deleteOne(query: object, options?: CommonOptions): Promise<void>;

  deleteMany(query: object, options?: CommonOptions): Promise<void>;

  findOneAndRemove(
    query: object,
    options?: { projection?: object; sort?: object },
  ): Promise<T | null>;

  findByIdAndRemove(
    id: string,
    options?: { projection?: object; sort?: object },
  ): Promise<T | null>;

  prepareId(data: any): T;
}

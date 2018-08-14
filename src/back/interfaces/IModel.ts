import { CollectionInsertOneOptions, FindOneOptions } from "mongodb";

export interface IModel<P> {
  read(query: { [key: string]: any }, options?: FindOneOptions, uid?: string): Promise<P[]>;

  readOne(query: { [key: string]: any }, options?: FindOneOptions, uid?: string): Promise<P | null>;

  getMap(): Promise<Map<string, P>>;

  readById(id: string): Promise<P | null>;

  create(
    data: { [key: string]: any },
    uid: string,
    wsid: string,
    options?: CollectionInsertOneOptions,
    excludeCurrentDevice?: boolean,
  ): Promise<P | null>;

  update(
    data: { [key: string]: any },
    uid: string,
    wsid: string,
    options?: CollectionInsertOneOptions,
    excludeCurrentDevice?: boolean,
  ): Promise<P | null>;

  remove(
    id: string,
    uid: string,
    wsid: string,
    options?: { projection?: object; sort?: object },
    excludeCurrentDevice?: boolean,
  ): Promise<P | null>;
}

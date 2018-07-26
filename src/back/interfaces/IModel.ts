import { FindOneOptions } from "mongodb";

export interface IModel<P, I> {
  read(query: { [key: string]: any }, options?: FindOneOptions, uid?: string): Promise<P[]>;

  readById(id: string): Promise<P | null>;

  getMap(): Promise<Map<string, P>>;

  create(data: { [key: string]: any }, uid: string, wsid: string): Promise<P | null>;

  update(data: { [key: string]: any }, uid: string, wsid: string): Promise<P | null>;

  remove(id: string, uid: string, wsid: string): Promise<P | null>;
}
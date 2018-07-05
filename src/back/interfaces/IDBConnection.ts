import { Db } from "mongodb";

export interface IDBConnection {
  connection(): Promise<Db>;
  disconnect(): Promise<void>;
  getDB(): Promise<Db>;
}

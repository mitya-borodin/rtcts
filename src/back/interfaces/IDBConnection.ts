export interface IDBConnection<Db> {
  connection(): Promise<Db>;
  disconnect(): Promise<void>;
  getDB(): Promise<Db>;
}

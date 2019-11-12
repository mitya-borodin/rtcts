/* eslint-disable @typescript-eslint/interface-name-prefix */
export interface IDBConnection<Db> {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getDB(): Promise<Db>;
}

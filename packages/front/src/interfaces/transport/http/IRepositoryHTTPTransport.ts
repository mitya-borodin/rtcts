import { IHTTPTransport } from "./IHTTPTransport";

export interface IRepositoryHTTPTransport<T> extends IHTTPTransport {
  ACL: {
    collection: string[];
    read: string[];
    create: string[];
    update: string[];
    remove: string[];
    onChannel: string[];
    offChannel: string[];
  };

  collection(): Promise<T[] | void>;
  read(id: string): Promise<T | void>;
  create(data: object): Promise<T | void>;
  update(data: object): Promise<T | void>;
  remove(id: string): Promise<T | void>;
}

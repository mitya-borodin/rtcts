import { IHTTPTransport } from "./IHTTPTransport";

export interface ISingletonHTTPTransport<T> extends IHTTPTransport {
  ACL: {
    read: string[];
    update: string[];
    onChannel: string[];
    offChannel: string[];
  };

  read(): Promise<T | void>;
  update(data: object): Promise<T | void>;
}

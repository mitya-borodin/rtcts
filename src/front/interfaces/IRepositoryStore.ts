import { ObservableMap } from "mobx";
import { IStore } from "./IStore";

export interface IRepositoryStore<T> extends IStore {
  list: T[];
  plainMap: Map<string, T>;
  map: ObservableMap<string, T>;

  init(): Promise<void>;

  create(data: object): Promise<T | void>;

  update(data: object): Promise<T | void>;

  remove(id: string): Promise<T | void>;

  receiveMessage(message: [string, any]): T | void | Promise<void>;
}

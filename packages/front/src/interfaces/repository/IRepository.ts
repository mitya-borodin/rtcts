import { IEventEmitter } from "@borodindmitriy/interfaces";
import { ObservableMap } from "mobx";

export interface IRepository<T> extends IEventEmitter {
  pending: boolean;

  // ! COMPUTED
  map: ObservableMap<string, T>;
  list: T[];

  // ! CRUD
  init(): Promise<void>; // ! READ ALL COLLECTION
  create(data: object): Promise<T | void>;
  update(data: object): Promise<T | void>;
  remove(id: string): Promise<T | void>;
}

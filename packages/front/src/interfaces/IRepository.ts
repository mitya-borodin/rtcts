import { IEventEmitter } from "@borodindmitriy/interfaces";
import { ObservableMap } from "mobx";

export interface IRepository<T> extends IEventEmitter {
  pending: boolean;

  map: ObservableMap<string, T>;
  list: T[];

  init(): Promise<void>;

  create(data: object): Promise<T | void>;

  update(data: object): Promise<T | void>;

  remove(id: string): Promise<T | void>;
}

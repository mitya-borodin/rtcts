import { IEventEmitter } from "@borodindmitriy/interfaces";
import { ObservableMap } from "mobx";

export interface IRepository<T> extends IEventEmitter {
  isInit: boolean;
  isLoading: boolean;
  map: ObservableMap<string, T>;
  plainMap: Map<string, T>;
  list: T[];

  init(): Promise<void>;

  create(data: object): Promise<T | void>;

  update(data: object): Promise<T | void>;

  remove(id: string): Promise<T | void>;

  receiveMessage(message: [string, any]): T | T[] | void;
}

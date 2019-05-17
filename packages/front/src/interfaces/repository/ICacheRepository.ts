import { IEventEmitter } from "@borodindmitriy/interfaces";
import { ObservableMap } from "mobx";

export interface ICacheRepository<T extends { id: string | void }> extends IEventEmitter {
  map: ObservableMap<string, T>;
  list: T[];

  update(cache: T[]): void;
  remove(id: string[]): void;
}

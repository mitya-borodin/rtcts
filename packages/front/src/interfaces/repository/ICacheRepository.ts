import { ObservableMap } from "mobx";

export interface ICacheRepository<T> {
  map: ObservableMap<string, T>;
  list: T[];

  update(cache: T[]): void;
  remove(id: string[]): void;
}

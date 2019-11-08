import { IEventEmitter } from "@borodindmitriy/interfaces";

export interface ISingletonRepository<T> extends IEventEmitter {
  pending: boolean;

  entity: T | void;

  init(): Promise<void>;
  update(entity: object): Promise<T | void>;
}

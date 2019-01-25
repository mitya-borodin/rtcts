import { IEventEmitter } from "@borodindmitriy/interfaces";

export interface ICommonStore<T> extends IEventEmitter {
  isInit: boolean;
  isLoading: boolean;
  data: T | void;

  init(): Promise<void>;

  update(data: object): Promise<T | void>;

  receiveMessage(message: [string, any]): T | T[] | void;
}

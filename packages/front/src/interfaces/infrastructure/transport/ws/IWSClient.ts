import { IEventEmitter } from "@borodindmitriy/interfaces";

export interface IWSClient extends IEventEmitter {
  isOpen: boolean;
  isAssigment: boolean;
  readyState: number;
  wsid: string;

  setUserID(uid: string): void;

  connect(): Promise<void>;

  reconnect(): Promise<void>;

  disconnect(reason?: string): Promise<void>;

  send(
    channelName: string,
    payload: {
      [key: string]: any;
    },
  ): void;

  assigmentToUserOfTheConnection(): Promise<void>;

  cancelAssigmentToUserOfTheConnection(): Promise<void>;
}

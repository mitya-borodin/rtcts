import { IEventEmitter } from "@borodindmitriy/interfaces";

export interface IWSClient extends IEventEmitter {
  // ! STATE
  isOpen: boolean;
  isAssigment: boolean;
  readyState: number;
  wsid: string;

  setUserID(uid: string): void;

  // ! CONNECT
  connect(): Promise<void>;
  reconnect(): Promise<void>;
  disconnect(reason?: string): Promise<void>;

  // ! SEND
  send(
    channelName: string,
    payload: {
      [key: string]: any;
    },
  ): void;

  // ! ASSIGMENT
  assigmentToUserOfTheConnection(): Promise<void>;
  cancelAssigmentToUserOfTheConnection(): Promise<void>;
}

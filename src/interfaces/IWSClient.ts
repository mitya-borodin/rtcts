import { IEventEmitter } from "./IEventEmitter";

export interface IWSClient extends IEventEmitter {
  readyState: number;
  isAssigment: boolean;
  wsid: string;

  setUserID(uid: string): void;

  connect(): Promise<void>;

  reconnect(): void;

  disconnect(reason?: string): void;

  send(
    channelName: string,
    payload: {
      [key: string]: any;
    },
  ): void;

  handleOpen(): void;

  handleClose(event: any): void;

  handleError(error: Error): void;

  assigmentToUserOfTheConnection(): Promise<void>;

  cancelAssigmentToUserOfTheConnection(): Promise<void>;
}

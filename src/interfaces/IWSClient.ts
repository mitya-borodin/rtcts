import { IEventEmitter } from "./IEventEmitter";

export interface IWSClient extends IEventEmitter {
  readyState: number;
  isAssigment: boolean;
  wsid: string;
  uid: string;

  connect(): Promise<void>;

  send(
    channelName: string,
    payload: {
      [key: string]: any;
    },
  ): void;

  reconnect(): void;

  disconnect(reason?: string): Promise<void>;

  handleOpen(): void;

  handleClose(event: any): void;

  handleError(error: Error): void;

  assigmentToUserOfTheConnection(): Promise<void>;

  cancelAssigmentToUserOfTheConnection(): Promise<void>;
}

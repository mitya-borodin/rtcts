import * as WebSocket from "ws";

export interface IConnection {
  wsid: string;
  uid: string | void;
  ws: WebSocket;

  getConnectionID(): string;

  isOwner(uid: string): boolean;

  isItSelf(uid: string, wsid: string): boolean;

  setUserID(uid: string): void;

  send(data: any): void;

  wasTermintate(): boolean;

  close(message?: string): void;

  terminate(message?: string): void;
}

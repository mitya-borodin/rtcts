import { IConnection } from "./IConnection";

export interface IChannels<C extends IConnection = IConnection> {
  addConnection(a_connection: C): void;

  deleteConnection(a_connection: C): void;

  on(chName: string, uid: string, wsid: string): void;

  off(chName: string, uid: string, wsid: string): void;

  send(
    chName: string,
    payload: { [key: string]: any },
    uid: string,
    wsid: string,
    excludeCurrentDevice?: boolean,
  ): void;
}

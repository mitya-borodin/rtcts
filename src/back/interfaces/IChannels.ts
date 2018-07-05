import { IConnection } from "./IConnection";

export interface IChannels {
  addConnection(a_connection: IConnection): void;

  deleteConnection(a_connection: IConnection): void;

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

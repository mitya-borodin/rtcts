import chalk from "chalk";
import * as uuid from "uuid/v1";
import * as WebSocket from "ws";
import { IConnection } from "../back/interfaces/IConnection";
import { isString } from "../utils/isType";

export class Connection implements IConnection {
  public static getConnectionID(uid: string, wsid: string): string {
    return `[ CONNECTION_ID ][ uid: ${uid} ][ wsid: ${wsid} ]`;
  }
  public wsid: string;
  public uid: string | void;
  public readonly ws: WebSocket;
  private isAlive: boolean;
  private heartbeat: () => void;

  constructor(ws: WebSocket) {
    this.ws = ws;
    this.isAlive = true;
    this.wsid = uuid();
    this.uid = undefined;

    this.heartbeat = (): void => {
      this.isAlive = true;

      // console.info("[ PONG ][ HEARD_BEAT ]", this.isAlive);
    };

    this.ws.on("pong", this.heartbeat);
  }

  public getConnectionID(): string {
    if (isString(this.uid) && this.uid.length > 0) {
      return Connection.getConnectionID(this.uid, this.wsid);
    }

    console.log("");
    console.error(chalk.redBright(`[ CONNECTION ][ ERROR ][ GET_CONNECTION_ID ][ UID_IS_NOT_DEFINED ]`));

    return "";
  }

  public isOwner(uid: string): boolean {
    if (isString(this.uid) && this.uid.length > 0) {
      return this.uid === uid;
    }

    console.log("");
    console.error(chalk.redBright(`[ CONNECTION ][ ERROR ][ IS_OWNER ][ UID_IS_NOT_DEFINED ]`));

    return false;
  }

  public isItSelf(uid: string, wsid: string): boolean {
    if (isString(this.uid) && this.uid.length > 0) {
      return this.uid === uid && this.wsid === wsid;
    }

    console.log("");
    console.error(chalk.redBright(`[ CONNECTION ][ ERROR ][ IS_ITSELF ][ UID_IS_NOT_DEFINED ]`));

    return false;
  }

  public setUserID(uid: string): void {
    if (!isString(this.uid)) {
      this.uid = uid;
    } else {
      console.log("");
      console.error(chalk.redBright(`[ CONNECTION ][ ERROR ][ USER_ID_ALREADY_EXIST ]`));
    }
  }

  public send(data: any): void {
    this.ws.send(data);
  }

  public wasTermintate(): boolean {
    if (this.isAlive) {
      this.isAlive = false;

      // console.info("[ PING ][ HEARD_BEAT ]", this.isAlive);

      this.ws.ping("", false, (error) => {
        if (error) {
          console.error(error);
        }
      });

      return false;
    } else {
      this.terminate();

      console.log("");
      console.log(chalk.redBright(`[ CONNECTION ][ TERMINATE ][ CLIENT_DID_NOT_PONG ]`));

      return true;
    }
  }

  public close(message?: string): void {
    this.ws.removeEventListener("pong", this.heartbeat);
    this.ws.removeAllListeners();
    this.ws.close(1000, "[ CLOSE ] " + message);

    console.log("");
    console.log(chalk.blueBright(`[ CONNECTION ][ CLOSE ] ${message}`));
  }

  public terminate(message?: string): void {
    this.isAlive = false;
    this.ws.removeEventListener("pong", this.heartbeat);
    this.ws.removeAllListeners();
    this.ws.terminate();

    console.log("");
    console.log(chalk.blueBright(`[ CONNECTION ][ TERMINATE ] ${message || ""}`));
  }
}

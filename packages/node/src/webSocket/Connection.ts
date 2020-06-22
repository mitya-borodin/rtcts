import { isString } from "@rtcts/utils";
import chalk from "chalk";
import uuid from "uuid/v1";
import WebSocket from "ws";

export class Connection {
  public static getConnectionID(uid: string, wsid: string): string {
    return `[ CONNECTION_ID ][ uid: ${uid} ][ wsid: ${wsid} ]`;
  }

  public readonly ws: WebSocket;
  public wsid: string;
  public uid: string | void;
  private isAlive: boolean;
  private heartbeat: () => void;

  constructor(ws: WebSocket) {
    this.ws = ws;
    this.wsid = uuid();
    this.uid = undefined;
    this.isAlive = true;
    this.heartbeat = (): void => {
      this.isAlive = true;

      // console.info("[ PONG ][ HEARD_BEAT ]", this.isAlive);
    };

    this.ws.on("pong", this.heartbeat);
  }

  public getConnectionID = (): string => {
    try {
      if (isString(this.uid) && this.uid.length > 0) {
        return Connection.getConnectionID(this.uid, this.wsid);
      }

      console.error(
        chalk.red(
          `[ CONNECTION ][ ERROR ][ uid is not defined, it is impossible to connectionID ]`,
        ),
      );

      return "";
    } catch (error) {
      console.error(error);

      return "";
    }
  };

  public isOwner = (uid: string): boolean => {
    if (isString(this.uid) && this.uid.length > 0) {
      return this.uid === uid;
    }

    console.error(chalk.red(`[ CONNECTION ][ ERROR ][ uid is not defined ]`));

    return false;
  };

  public isItSelf = (uid: string, wsid: string): boolean => {
    if (isString(this.uid) && this.uid.length > 0) {
      return this.uid === uid && this.wsid === wsid;
    }

    console.error(chalk.red(`[ CONNECTION ][ ERROR ][ uid is not defined ]`));

    return false;
  };

  public setUserID = (uid: string): void => {
    if (!isString(this.uid)) {
      this.uid = uid;
    } else {
      console.error(chalk.yellow(`[ CONNECTION ][ ERROR ][ uid is already defined ]`));
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public send = (data: any): void => {
    try {
      this.ws.send(data);
    } catch (error) {
      console.error(error);
    }
  };

  public wasTerminate = (): boolean => {
    try {
      if (this.isAlive) {
        this.isAlive = false;

        // console.info("[ PING ][ HEARD_BEAT ]", this.isAlive);

        this.ws.ping("", false, (error) => {
          if (error) {
            console.error(error);
          }
        });
      } else {
        this.terminate();

        console.warn(
          chalk.yellow(
            `[ CONNECTION ][ the connection was terminated because the client did not respond to PING ]`,
          ),
        );

        return true;
      }
    } catch (error) {
      console.error(error);
    }

    return false;
  };

  public close = (message = ""): void => {
    try {
      this.ws.removeEventListener("pong", this.heartbeat);
      this.ws.removeAllListeners();
      this.ws.close(1000, `[ CLOSE ] ${message}`);

      console.log(
        chalk.white(`[ CONNECTION ][ the connection was closed with a message: ${message} ]`),
      );
    } catch (error) {
      console.error(error);
    }
  };

  public terminate = (message?: string): void => {
    try {
      this.isAlive = false;
      this.ws.removeEventListener("pong", this.heartbeat);
      this.ws.removeAllListeners();
      this.ws.terminate();

      console.log("");
      console.log(
        chalk.white(`[ CONNECTION ][ the connection was terminated with a message: ${message} ]`),
      );
    } catch (error) {
      console.error(error);
    }
  };
}

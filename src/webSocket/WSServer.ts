import chalk from "chalk";
import * as express from "express";
import * as WebSocket from "ws";
import { IAppConfig } from "../interfaces/IAppConfig";
import { IChannels } from "../interfaces/IChannels";
import { IConnection } from "../interfaces/IConnection";
import { IPersist } from "../interfaces/IPersist";
import { IUser } from "../interfaces/IUser";
import { IUserGroup } from "../interfaces/IUserGroup";
import { IUserModel } from "../interfaces/IUserModel";
import { isArray, isString } from "../utils/isType";
import {
  assigment_to_user_of_the_connection_channel,
  cancel_assigment_to_user_of_the_connection_channel,
  PingChannel,
  PongChannel,
} from "./const";
import { makeErrorMessage, makeMessage, recognizeMessage } from "./helpers";

export class WSServer<U extends IUserModel<IUser<G> & IPersist, IUser<G>, G>, G extends IUserGroup> {
  private config: IAppConfig;
  private server: WebSocket.Server;
  private connections: Set<IConnection>;
  private Connection: { new (data: any): IConnection };
  private channels: IChannels;
  private user: U;
  private wasRun: boolean;
  private interval: NodeJS.Timer;

  constructor(Connection: { new (data: any): IConnection }, channels: IChannels, config: IAppConfig, user: U) {
    this.Connection = Connection;
    this.connections = new Set();
    this.channels = channels;
    this.config = config;
    this.user = user;
    this.server = new WebSocket.Server({ host: this.config.ws.host, port: this.config.ws.port });
    this.wasRun = false;

    this.run = this.run.bind(this);
    this.connectionHandler = this.connectionHandler.bind(this);
  }

  public run() {
    if (!this.wasRun) {
      console.log(
        chalk.blueBright.bold(`[ WS ][ SERVER ][ RUN ][ ws://${this.config.ws.host}:${this.config.ws.port} ]`),
      );
      this.wasRun = true;
      this.server.on("connection", this.connectionHandler);
      this.server.on("error", () => {
        clearInterval(this.interval);
        let connsectionToDelete: IConnection[] = [];

        for (const connection of this.connections) {
          this.channels.deleteConnection(connection);

          connsectionToDelete.push(connection);
        }

        for (const id of connsectionToDelete) {
          this.connections.delete(id);
        }

        connsectionToDelete = [];
      });

      this.interval = setInterval(() => {
        for (const connection of this.connections) {
          if (connection.wasTermintate()) {
            this.connections.delete(connection);
          }
        }
      }, 1000);
    }
  }

  private connectionHandler(ws: WebSocket, req: express.Request) {
    const connection = new this.Connection(ws);
    const messageHandler = this.messageHandler.bind(this, connection);

    this.connections.add(connection);

    console.log("");
    console.log(chalk.cyan.bold("[ CONNECTION ][ CONNECTION_COUNT ][ APP ]: " + this.connections.size));
    console.log(chalk.cyan.bold("[ CONNECTION ][ CONNECTION_COUNT ][ SERVER ]: " + this.server.clients.size));

    ws.on("message", messageHandler);
    ws.on("close", (code, message) => {
      ws.removeEventListener("message", messageHandler);
      ws.removeAllListeners();
      this.connections.delete(connection);
      this.channels.deleteConnection(connection);

      console.log("");
      console.log(chalk.cyan.bold("[ CLOSE ][ CONNECTION_COUNT ][ APP ]: " + this.connections.size));
      console.log(chalk.cyan.bold("[ CLOSE ][ CONNECTION_COUNT ][ SERVER ]: " + this.server.clients.size));
      console.log("");
      console.log(chalk.grey.bold(`[ CLOSE ][ CODE ]: ${code}`));
      console.log(chalk.grey.bold(`[ CLOSE ][ MESSAGE ]: ${message}`));
      console.log(chalk.grey.bold(`[ CLOSE ]${connection.getConnectionID()}`));
    });
    ws.on("error", (error) => {
      ws.removeEventListener("message", messageHandler);
      ws.removeAllListeners();
      this.connections.delete(connection);
      this.channels.deleteConnection(connection);

      console.log("");
      console.log(chalk.cyan.bold("[ ERROR ][ CONNECTION_COUNT ][ APP ]: " + this.connections.size));
      console.log(chalk.cyan.bold("[ ERROR ][ CONNECTION_COUNT ][ SERVER ]: " + this.server.clients.size));
      console.log(chalk.redBright(`[ ERROR ]${connection.getConnectionID()}`));
      console.error(error);
    });
  }

  private messageHandler(connection: IConnection, message: string | Buffer | ArrayBuffer | Buffer[]): void {
    if (isString(message)) {
      const recieveData = this.recognizeMessage(message);

      if (isArray(recieveData)) {
        const [channelName, payload] = recieveData;

        if (isString(payload.uid)) {
          if (
            channelName === assigment_to_user_of_the_connection_channel ||
            channelName === cancel_assigment_to_user_of_the_connection_channel
          ) {
            this.user
              .readById(payload.uid)
              .then((user: IUser<G> & IPersist | null) => {
                if (user) {
                  connection.setUserID(user.id);

                  if (channelName === assigment_to_user_of_the_connection_channel) {
                    this.channels.addConnection(connection);

                    connection.send(
                      this.makeMessage(channelName, {
                        message: "[ ASSIGMENT ][ DONE ]",
                        uid: connection.uid,
                        wsid: connection.wsid,
                      }),
                    );
                  }
                  if (channelName === cancel_assigment_to_user_of_the_connection_channel) {
                    this.channels.deleteConnection(connection);

                    connection.send(
                      this.makeMessage(channelName, {
                        message: "[ CANCELING ][ ASSIGMENT ][ DONE ]",
                        uid: connection.uid,
                        wsid: connection.wsid,
                      }),
                    );
                  }
                } else {
                  connection.send(
                    this.makeErrorMessage(`[ ASSIGMENT_ERROR ] user by id: ${payload.uid} not found`, {
                      channelName,
                      payload,
                    }),
                  );
                }
              })
              .catch((error) => {
                connection.send(this.makeErrorMessage(`[ ASSIGMENT_ERROR ] ${error.message}`, { error, payload }));
              });
          } else if (channelName === PingChannel) {
            connection.send(this.makeMessage(PongChannel, {}));
          } else {
            connection.send(
              this.makeErrorMessage(`[ This channel: ${channelName} is not in service ]`, { channelName, payload }),
            );
          }
        } else {
          console.log("");
          console.log(chalk.redBright(`[ MESSAGE_HANDLING ][ DETECT_ID ] payload must have userID;`));
        }
      } else {
        console.log("");
        console.log(
          chalk.redBright(`[ MESSAGE_HANDLING ][ RECIEVE_DATA ] must be [ String, { [ key: string ]: any } ]`),
        );
      }
    } else {
      console.log("");
      console.log(
        chalk.redBright(
          `[ MESSAGE_HANDLING ] have NOT implement message hanler for other data types Buffer | ArrayBuffer | Buffer[]`,
        ),
      );
    }
  }

  private recognizeMessage(message: string): [string, { [key: string]: any }] {
    return recognizeMessage(message);
  }

  private makeMessage(channelName: string, payload: { [key: string]: any }): string {
    return makeMessage(channelName, payload);
  }

  private makeErrorMessage(message: string, payload: any): [string, { [key: string]: any }] {
    return makeErrorMessage(message, payload);
  }
}

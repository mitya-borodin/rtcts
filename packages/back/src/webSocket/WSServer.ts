import chalk from "chalk";
import * as express from "express";
import * as WebSocket from "ws";
import { IAppConfig } from "../interfaces/IAppConfig";
import { IChannels } from "../interfaces/IChannels";
import { IConnection } from "../interfaces/IConnection";
import { IUserModel } from "../interfaces/IUserModel";
import { IPersist, IUser } from "@borodindmitriy/interfaces";
import { getErrorMessage, isArray, isString } from "@borodindmitriy/utils";
import {
  assigment_to_user_of_the_connection_channel,
  cancel_assigment_to_user_of_the_connection_channel,
  PingChannel,
  PongChannel,
  makeErrorMessage,
  makeMessage,
  recognizeMessage,
} from "@borodindmitriy/isomorphic";

export class WSServer<U extends IUserModel<IUser & IPersist>> {
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
    try {
      if (!this.wasRun) {
        console.log(
          chalk.blueBright.bold(`[ WS ][ SERVER ][ RUN ][ ws://${this.config.ws.host}:${this.config.ws.port} ]`),
        );

        this.wasRun = true;
        this.server.on("connection", this.connectionHandler);
        this.server.on("error", (error) => {
          console.error(error);

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
              this.channels.deleteConnection(connection);
              this.connections.delete(connection);
              this.server.clients.delete(connection.ws);

              console.log(chalk.cyan.bold("[ TERMINATE ][ CONNECTION_COUNT ][ APP ]: " + this.connections.size));
              console.log(chalk.cyan.bold("[ TERMINATE ][ CONNECTION_COUNT ][ SERVER ]: " + this.server.clients.size));
            }
          }
        }, 2000);
      }
    } catch (error) {
      console.error(error);
    }
  }

  private connectionHandler(ws: WebSocket, req: express.Request): void {
    try {
      const connection = new this.Connection(ws);
      const messageHandler = this.messageHandler.bind(this, connection);

      this.connections.add(connection);

      console.log("");
      console.log(chalk.cyan.bold("[ NEW_CONNECTION ][ CONNECTION_COUNT ][ APP ]: " + this.connections.size));
      console.log(chalk.cyan.bold("[ NEW_CONNECTION ][ CONNECTION_COUNT ][ SERVER ]: " + this.server.clients.size));

      ws.on("message", messageHandler);

      ws.on("close", (code, message) => {
        ws.removeEventListener("message", messageHandler);
        ws.removeAllListeners();
        ws.terminate();
        this.connections.delete(connection);
        this.channels.deleteConnection(connection);
        this.server.clients.delete(connection.ws);

        console.log("");
        console.log(chalk.grey.bold(`[ CLOSE ][ CODE ]: ${code}`));
        console.log(chalk.grey.bold(`[ CLOSE ][ MESSAGE ]: ${message}`));
        console.log(chalk.grey.bold(`[ CLOSE ]${connection.getConnectionID()}`));
        console.log(chalk.cyan.bold("[ CLOSE ][ CONNECTION_COUNT ][ APP ]: " + this.connections.size));
        console.log(chalk.cyan.bold("[ CLOSE ][ CONNECTION_COUNT ][ SERVER ]: " + this.server.clients.size));
      });

      ws.on("error", (error) => {
        ws.removeEventListener("message", messageHandler);
        ws.removeAllListeners();
        ws.terminate();
        this.connections.delete(connection);
        this.channels.deleteConnection(connection);
        this.server.clients.delete(connection.ws);

        console.log("");
        console.log(chalk.cyan.bold("[ ERROR ][ CONNECTION_COUNT ][ APP ]: " + this.connections.size));
        console.log(chalk.cyan.bold("[ ERROR ][ CONNECTION_COUNT ][ SERVER ]: " + this.server.clients.size));
        console.log(chalk.cyan.bold(`[ ERROR ]${connection.getConnectionID()}`));

        console.error(error);
      });
    } catch (error) {
      console.error(error);
    }
  }

  private messageHandler(connection: IConnection, message: string | Buffer | ArrayBuffer | Buffer[]): void {
    try {
      if (isString(message)) {
        const recieveData = this.recognizeMessage(message);

        if (isArray(recieveData)) {
          const [channelName, payload] = recieveData;

          if (channelName === PingChannel) {
            connection.send(this.makeMessage(PongChannel, {}));
          } else if (isString(payload.uid)) {
            if (
              channelName === assigment_to_user_of_the_connection_channel ||
              channelName === cancel_assigment_to_user_of_the_connection_channel
            ) {
              this.user
                .readById(payload.uid)
                .then((user: IUser & IPersist | null) => {
                  if (user) {
                    if (channelName === assigment_to_user_of_the_connection_channel) {
                      connection.setUserID(user.id);

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
                .catch((error: any) => {
                  connection.send(
                    this.makeErrorMessage(`[ ASSIGMENT_ERROR ] ${getErrorMessage(error)}`, { error, payload }),
                  );
                });
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
            `[ MESSAGE_HANDLING ] have NOT implement message hanler for other data types
             Buffer | ArrayBuffer | Buffer[]`,
          ),
        );
      }
    } catch (error) {
      console.error(error);
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

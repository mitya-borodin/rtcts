/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  BindUserToConnection,
  UnbindUserFromConnection,
  makeErrorMessage,
  makeMessage,
  PingChannel,
  PongChannel,
  recognizeMessage,
  User,
  UserData,
} from "@rtcts/isomorphic";
import { getErrorMessage, isArray, isString, isUndefined } from "@rtcts/utils";
import chalk from "chalk";
import WebSocket from "ws";
import { Channels } from "./Channels";
import { Connection } from "./Connection";
import { Config } from "../app/Config";
import { UserModel } from "../model/UserModel";

export class WebSocketServer<
  USER_MODEL extends UserModel<USER, DATA, VA>,
  USER extends User<DATA, VA>,
  DATA extends UserData = UserData,
  VA extends object = object,
  CONFIG extends Config = Config
> {
  private wasRun: boolean;

  private config: CONFIG;
  private server: WebSocket.Server;
  private connections: Set<Connection>;
  private channels: Channels;

  private interval: NodeJS.Timer;

  private Connection: new (ws: WebSocket) => Connection;

  private userModel: USER_MODEL;

  constructor(
    Connection: new (ws: WebSocket) => Connection,
    channels: Channels,
    config: CONFIG,
    userModel: USER_MODEL,
  ) {
    this.wasRun = false;

    this.config = config;
    this.userModel = userModel;
    this.server = new WebSocket.Server({ host: this.config.ws.host, port: this.config.ws.port });
    this.Connection = Connection;
    this.channels = channels;

    this.interval = setInterval(() => null, 1000 * 1000);

    this.connections = new Set();

    this.run = this.run.bind(this);
    this.connectionHandler = this.connectionHandler.bind(this);
  }

  public run(): void {
    try {
      if (!this.wasRun) {
        console.log(
          chalk.green.bold(
            `[ WS ][ the connection is open at ws://${this.config.ws.host}:${this.config.ws.port} ]`,
          ),
        );

        this.wasRun = true;
        this.server.on("connection", this.connectionHandler);
        this.server.on("error", (error) => {
          console.error(error);

          clearInterval(this.interval);

          let connectionToDelete: Connection[] = [];

          for (const connection of this.connections) {
            this.channels.deleteConnection(connection);

            connectionToDelete.push(connection);
          }

          for (const id of connectionToDelete) {
            this.connections.delete(id);
          }

          connectionToDelete = [];
        });

        this.interval = setInterval(() => {
          for (const connection of this.connections) {
            if (connection.wasTerminate()) {
              this.channels.deleteConnection(connection);
              this.connections.delete(connection);
              this.server.clients.delete(connection.ws);

              console.log(
                chalk.white(
                  `[ TERMINATE ][ number of connections the application has ][ ${this.connections.size} ]`,
                ),
              );
              console.log(
                chalk.white(
                  `[ TERMINATE ][ number of connections the server has ][ ${this.server.clients.size} ]`,
                ),
              );
            }
          }
        }, 2000);
      }
    } catch (error) {
      console.error(error);
    }
  }

  private connectionHandler(ws: WebSocket): void {
    try {
      const connection = new this.Connection(ws);
      const messageHandler = this.messageHandler.bind(this, connection);

      this.connections.add(connection);

      console.log(
        chalk.green(
          `[ NEW_CONNECTION ][ number of connections the application has ][ ${this.connections.size} ]`,
        ),
      );
      console.log(
        chalk.green(
          `[ NEW_CONNECTION ][ number of connections the server has ][ ${this.server.clients.size} ]`,
        ),
      );

      ws.on("message", messageHandler);

      ws.on("close", (code, message) => {
        ws.removeEventListener("message", messageHandler);
        ws.removeAllListeners();
        ws.terminate();
        this.connections.delete(connection);
        this.channels.deleteConnection(connection);
        this.server.clients.delete(connection.ws);

        console.log("");
        console.log(chalk.grey(`[ CLOSE ][ CODE ]: ${code}`));
        console.log(chalk.grey(`[ CLOSE ][ MESSAGE ]: ${message}`));
        console.log(chalk.grey(`[ CLOSE ]${connection.getConnectionID()}`));
        console.log(
          chalk.grey(
            `[ CLOSE ][ number of connections the application has ][ ${this.connections.size} ]`,
          ),
        );
        console.log(
          chalk.grey(
            `[ CLOSE ][ number of connections the server has ][ ${this.server.clients.size} ]`,
          ),
        );
      });

      ws.on("error", (error) => {
        ws.removeEventListener("message", messageHandler);
        ws.removeAllListeners();
        ws.terminate();
        this.connections.delete(connection);
        this.channels.deleteConnection(connection);
        this.server.clients.delete(connection.ws);

        console.log("");
        console.log(
          chalk.red(
            `[ ERROR ][ number of connections the application has ][ ${this.connections.size} ]`,
          ),
        );
        console.log(
          chalk.red(
            `[ ERROR ][ number of connections the server has ][ ${this.server.clients.size} ]`,
          ),
        );
        console.log(chalk.red(`[ ERROR ]${connection.getConnectionID()}`));
        console.error(error);
      });
    } catch (error) {
      console.error(error);
    }
  }

  private messageHandler(
    connection: Connection,
    message?: string | Buffer | ArrayBuffer | Buffer[],
  ): void {
    try {
      if (!isUndefined(message)) {
        if (isString(message)) {
          const receiveData = this.recognizeMessage(message);

          if (isArray(receiveData)) {
            const [channelName, payload] = receiveData;

            if (channelName === PingChannel) {
              connection.send(this.makeMessage(PongChannel, {}));
            } else if (isString(payload.uid)) {
              if (
                channelName === BindUserToConnection ||
                channelName === UnbindUserFromConnection
              ) {
                this.userModel
                  .getUserById(payload.uid)
                  .then((user: USER | null) => {
                    if (user && user.isEntity()) {
                      if (channelName === BindUserToConnection) {
                        connection.setUserID(user.id);

                        this.channels.addConnection(connection);

                        connection.send(
                          this.makeMessage(channelName, {
                            message: "BIND_USER_TO_CONNECTION [ DONE ]",
                            uid: connection.uid,
                            wsid: connection.wsid,
                          }),
                        );
                      }

                      if (channelName === UnbindUserFromConnection) {
                        this.channels.deleteConnection(connection);

                        connection.send(
                          this.makeMessage(channelName, {
                            message: "UNBIND_USER_FROM_CONNECTION [ DONE ]",
                            uid: connection.uid,
                            wsid: connection.wsid,
                          }),
                        );
                      }
                    } else {
                      connection.send(
                        this.makeErrorMessage(
                          `BIND_USER_TO_CONNECTION [ FAIL ] [ user by id: ${payload.uid} not found ]`,
                          {
                            channelName,
                            payload,
                          },
                        ),
                      );
                    }
                  })
                  .catch((error: any) => {
                    connection.send(
                      this.makeErrorMessage(
                        `BIND_USER_TO_CONNECTION [ FAIL ] [ ${getErrorMessage(error)} ]`,
                        {
                          error,
                          payload,
                        },
                      ),
                    );
                  });
              } else {
                connection.send(
                  this.makeErrorMessage(`[ This channel: ${channelName} is not serviced ]`, {
                    channelName,
                    payload,
                  }),
                );
              }
            } else {
              console.log("");
              console.log(
                chalk.redBright(`[ MESSAGE_HANDLING ][ DETECT_ID ] payload must have uid`),
              );
            }
          } else {
            console.log("");
            console.log(
              chalk.redBright(
                `[ MESSAGE_HANDLING ][ RECEIVE_DATA ] must be [ string, { [ key: string ]: any } ]`,
              ),
            );
          }
        } else {
          console.log("");
          console.error(
            chalk.redBright(
              `[ MESSAGE_HANDLING ] have NOT implement message handler ` +
                `for other data types Buffer | ArrayBuffer | Buffer[]`,
            ),
          );
        }
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

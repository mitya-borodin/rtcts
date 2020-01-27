/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-unused-vars */
import {
  BindUserToConnection,
  ErrorChannel,
  makeMessage,
  PingChannel,
  PongChannel,
  recognizeMessage,
  UnbindUserFromConnection,
  wsEventEnum,
} from "@rtcts/isomorphic";
import { getErrorMessage } from "@rtcts/utils";
import EventEmitter from "eventemitter3";
import { action, computed, observable } from "mobx";

export class WSClient extends EventEmitter {
  @observable
  public readyState = WebSocket.CLOSED;
  @observable
  public isUserBindToConnection = false;
  public wsid: string;

  protected uid: string;
  protected readonly path: string;
  protected readonly reconnectionDelay: number;
  protected readonly pingPongDelay: number;
  protected connection: WebSocket | null;
  protected isAlive: boolean;
  protected reconnectTimeOut: number;
  protected heartbeatInterval: number;

  constructor(
    host = window.location.host,
    path = "ws",
    TLS = true,
    pingPongDelay = 3000,
    reconnectionDelay = 5000,
  ) {
    super();

    // PROPS
    this.isAlive = true;
    this.uid = "";
    this.path = `${TLS ? "wss" : "ws"}://${host}/${path}`;

    // IS_ALIVE
    this.pingPongDelay = pingPongDelay;

    // RECONNECTION
    this.reconnectionDelay = reconnectionDelay;
    this.reconnectTimeOut = 0;
    this.heartbeatInterval = 0;

    // BINDINGS
    this.connect = this.connect.bind(this);
    this.reconnect = this.reconnect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.openingHandler = this.openingHandler.bind(this);
    this.bindUserToConnection = this.bindUserToConnection.bind(this);
    this.unbindUserFromConnection = this.unbindUserFromConnection.bind(this);
    this.bindUserToConnectionHandler = this.bindUserToConnectionHandler.bind(this);
    this.unbindUserToConnectionHandler = this.unbindUserToConnectionHandler.bind(this);
    this.ping = this.ping.bind(this);
    this.pong = this.pong.bind(this);
  }

  @computed({ name: "WSClient.isOpen" })
  get isOpen(): boolean {
    return this.readyState === WebSocket.OPEN;
  }

  public setUserID(uid: string): void {
    this.uid = uid;
  }

  @action("WSClient.connect")
  public async connect(): Promise<void> {
    try {
      if (this.connection instanceof WebSocket) {
        if (this.connection.readyState === WebSocket.OPEN) {
          console.log(`The connection is already established`);
          return;
        }

        if (this.connection.readyState !== WebSocket.OPEN) {
          return await this.reconnect();
        }
      }

      this.readyState = WebSocket.CONNECTING;

      await new Promise<void>((resolve, reject) => {
        this.connection = new WebSocket(this.path);

        this.connection.onopen = (event: Event): void => {
          this.openingHandler();

          resolve();
        };

        this.connection.onclose = (event: CloseEvent): void => {
          this.emit(wsEventEnum.CLOSE, {});

          if (event.code !== 1000) {
            this.reconnect();
          }

          console.warn(event);

          reject(event);
        };

        this.connection.onerror = (event: Event): void => {
          console.error(event);

          reject();
        };

        this.connection.onmessage = (event): void => {
          const [chName, data] = recognizeMessage(event.data);

          if (chName !== PongChannel) {
            console.info("The received message", [chName, data]);
          }

          if (chName === BindUserToConnection) {
            this.bindUserToConnectionHandler({ uid: data.uid, wsid: data.wsid });
          } else if (chName === UnbindUserFromConnection) {
            this.unbindUserToConnectionHandler();
          } else if (chName === PongChannel) {
            this.pong();
          } else if (chName === ErrorChannel) {
            this.emit(wsEventEnum.ERROR, [chName, data]);
          } else {
            this.emit(wsEventEnum.MESSAGE_RECEIVE, [chName, data]);
          }
        };
      });
    } catch (error) {
      console.error(error);
    }
  }

  @action("[ WSClient.reconnect ]")
  public async reconnect(): Promise<void> {
    try {
      await new Promise<void>((resolve, reject) => {
        console.warn(
          `An attempt to restore the connection will occur after ${this.reconnectionDelay} ms`,
        );

        this.dropConnectionData();

        this.reconnectTimeOut = window.setTimeout(async () => {
          console.warn(`Connection recovery attempt started`);

          try {
            await this.connect();
            await this.bindUserToConnection();

            console.warn(`The connection is restored`);

            resolve();
          } catch (error) {
            console.error(`Connection recovery error. Error message: ${getErrorMessage(error)}`);

            reject();
          } finally {
            window.clearTimeout(this.reconnectTimeOut);
          }
        }, this.reconnectionDelay);
      });
    } catch (error) {
      console.error(error);
    }
  }

  @action("[ WSClient.disconnect ]")
  public async disconnect(reason = "[ DISCONNECT ]"): Promise<void> {
    try {
      // Нужен для того чтобы закрыть соединение ПОЛНОСТЬЮ;

      // Шаг 1: Разъединяем uid и wsid, на этом шаге соединение браузера с сервером ещё активно.
      // Шаг 2: Вызываем метод нативный метод закрытия соединения, на этом шаге соединение разрывается
      //   и сервер очищает всех подписчиков.
      // Шаг 3: все поля в объекте приводятся к значениям по умолчанию и все счетчики сбрасываются.
      // Не используется если CLOSE или ERROR, так как но может быть закрыто или упасть с ошибкой по разным
      // причинам. И при CLOSE или ERROR необходимо выполнять reconnect если явно небыл вызван этот
      // метод disconnect;
      await new Promise<void>(async (resolve, reject) => {
        try {
          this.once(wsEventEnum.USER_UNBINDED_FROM_CONNECTION, () => {
            if (this.connection instanceof WebSocket) {
              this.connection.close(1000, reason);
            } else {
              throw new Error(`The current connection object is not an instance of WebSocket`);
            }
          });

          this.once(wsEventEnum.CLOSE, () => {
            this.dropConnectionData();
            this.uid = "";

            resolve();
          });

          await this.unbindUserFromConnection();

          console.log(`Connection disconnected`);
        } catch (error) {
          reject(`Connection disconnected with an error: ${getErrorMessage(error)}`);
        } finally {
          console.log(`Reason for disconnecting the connection: ${reason}`);
          console.log(`Number of remaining subscribers: ${this.listenerCount} `);
        }
      });
    } catch (error) {
      console.error(error);
    }
  }

  @action("[ WSClient.send ]")
  public send(
    channelName: string,
    payload: {
      [key: string]: any;
    },
  ): void {
    try {
      if (this.connection instanceof WebSocket) {
        if (this.isUserBindToConnection) {
          this.connection.send(makeMessage(channelName, payload));
        } else {
          console.info(`The user is not associated with any connection`);
        }
      } else {
        throw new Error(`The connection has not been established yet`);
      }
    } catch (error) {
      console.error(error);
    }
  }

  // При login необходимо объединить uid и wsid;
  @action("[ WSClient.bindUserToConnection ]")
  public async bindUserToConnection(): Promise<void> {
    try {
      await new Promise<void>((resolve, reject) => {
        if (this.uid.length > 0) {
          if (!this.isUserBindToConnection) {
            if (this.connection instanceof WebSocket) {
              if (this.connection.readyState === WebSocket.OPEN) {
                this.connection.send(makeMessage(BindUserToConnection, { uid: this.uid }));
                this.once(wsEventEnum.USER_BINDED_TO_CONNECTION, resolve);
              } else {
                console.info(`WSClient.send readyState: ${this.connection.readyState}`);

                setTimeout(this.bindUserToConnection, 1000);
              }
            } else {
              reject(`The connection has not been established yet`);
            }
          } else {
            reject(`The user is already connected to the connection`);
          }
        } else {
          reject(
            `The user ID is not specified, you should use method setUserID(uid: string) before`,
          );
        }
      });
    } catch (error) {
      console.error(error);
    }
  }

  // При logout необходимо разъединить uid и wsid;
  @action("[ WSClient.unbindUserFromConnection ]")
  public async unbindUserFromConnection(): Promise<void> {
    try {
      await new Promise<void>((resolve, reject) => {
        if (this.uid.length > 0) {
          if (this.connection instanceof WebSocket && this.isUserBindToConnection) {
            this.send(UnbindUserFromConnection, { uid: this.uid });
            this.once(wsEventEnum.USER_UNBINDED_FROM_CONNECTION, resolve);
          } else {
            reject(
              `The connection is not established or the user ID is not set or the user is not linked to the connection`,
            );
          }
        } else {
          reject(
            `The user ID is not specified, you should use method setUserID(uid: string) before`,
          );
        }
      });
    } catch (error) {
      console.error(error);
    }
  }

  protected openingHandler(): void {
    try {
      this.isAlive = true;
      // console.info("CONNECTION_OPEN", this.isAlive);

      this.heartbeatInterval = window.setInterval(async () => {
        if (this.isAlive) {
          // console.info("HEARD_BEAT", this.isAlive);
          this.isAlive = false;

          this.ping();
        } else {
          clearInterval(this.heartbeatInterval);

          // console.info("HEARD_BEAT_WRONG", this.isAlive);

          if (this.connection instanceof WebSocket) {
            this.once(wsEventEnum.CLOSE, () => setTimeout(this.reconnect, 0));

            this.connection.close(1000, "The server does not respond on PONG_CHANNEL.");
          } else {
            this.reconnect();
          }
        }
      }, this.pingPongDelay);

      this.emit(wsEventEnum.OPEN);
    } catch (error) {
      console.error(error);
    }
  }

  protected bindUserToConnectionHandler({ wsid, uid }: { wsid: string; uid: string }): void {
    try {
      this.readyState = WebSocket.OPEN;
      this.isUserBindToConnection = true;
      this.wsid = wsid;
      this.uid = uid;

      this.emit(wsEventEnum.USER_BINDED_TO_CONNECTION, {});
    } catch (error) {
      console.error(error);
    }
  }

  protected unbindUserToConnectionHandler(): void {
    try {
      this.readyState = WebSocket.CLOSED;
      this.isUserBindToConnection = false;
      this.wsid = "";

      this.emit(wsEventEnum.USER_UNBINDED_FROM_CONNECTION, {});
    } catch (error) {
      console.error(error);
    }
  }

  protected ping(): void {
    try {
      if (this.connection instanceof WebSocket) {
        // console.info("PING");
        this.connection.send(makeMessage(PingChannel, {}));
      }
    } catch (error) {
      console.error(error);
    }
  }

  protected pong(): void {
    // console.info("PONG");
    this.isAlive = true;
  }

  @action("[ WSClient.dropConnectionData ]")
  protected dropConnectionData(): void {
    try {
      window.clearTimeout(this.reconnectTimeOut);
      window.clearInterval(this.heartbeatInterval);

      this.connection = null;
      this.isUserBindToConnection = false;
      this.readyState = WebSocket.CLOSED;
      this.wsid = "";
    } catch (error) {
      console.error(error);
    }
  }
}

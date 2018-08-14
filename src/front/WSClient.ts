import { action, computed, observable, runInAction } from "mobx";
import { wsEventEnum } from "../enums/wsEventEnum";
import { EventEmitter } from "../isomorphic/EventEmitter";
import {
  assigment_to_user_of_the_connection_channel,
  cancel_assigment_to_user_of_the_connection_channel,
  ErrorChannel,
  PingChannel,
  PongChannel,
} from "../webSocket/const";
import { makeMessage, recognizeMessage } from "../webSocket/helpers";
import { IWSClient } from "./interfaces/IWSClient";

export class WSClient extends EventEmitter implements IWSClient {
  @observable public readyState = WebSocket.CLOSED;
  @observable public isAssigment = false;
  public wsid: string;

  protected uid: string;
  protected readonly path: string;
  protected readonly reconnectionDelay: number;
  protected readonly pingPongDelay: number;
  protected connection: WebSocket | null;
  protected isAlive: boolean;
  protected reconnectTimeOut: number;
  protected headrBeatInterval: number;

  constructor(host = window.location.host, path = "ws", TLS = true, pingPongDelay = 1000, reconnectionDelay = 5000) {
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
    this.headrBeatInterval = 0;

    // BINDINGS
    this.connect = this.connect.bind(this);
    this.reconnect = this.reconnect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.handleOpen = this.handleOpen.bind(this);
    this.assigmentToUserOfTheConnection = this.assigmentToUserOfTheConnection.bind(this);
    this.cancelAssigmentToUserOfTheConnection = this.cancelAssigmentToUserOfTheConnection.bind(this);
    this.handleAssigment = this.handleAssigment.bind(this);
    this.handleCancelAssigment = this.handleCancelAssigment.bind(this);
    this.ping = this.ping.bind(this);
    this.pong = this.pong.bind(this);
  }

  @computed
  get isOpen(): boolean {
    return this.readyState === WebSocket.OPEN;
  }

  public setUserID(uid: string): void {
    this.uid = uid;
  }

  public async connect(): Promise<void> {
    try {
      return await runInAction<Promise<void>>(`[ ${this.constructor.name} ][ CONNECT ]`, async () => {
        if (this.connection instanceof WebSocket) {
          if (this.connection.readyState === WebSocket.OPEN) {
            console.log(`[ ${this.constructor.name} ][ CONNECTION_ALLREADY_EXIST ]`);
            return;
          }

          if (this.connection.readyState !== WebSocket.OPEN) {
            return await this.reconnect();
          }
        }

        this.readyState = WebSocket.CONNECTING;

        await new Promise<void>((resolve, reject) => {
          this.connection = new WebSocket(this.path);

          this.connection.onopen = () => {
            this.handleOpen();
            resolve();
          };

          this.connection.onclose = (event) => {
            this.emit(wsEventEnum.CLOSE, {});

            if (event.code !== 1000) {
              this.reconnect();
            }

            console.warn(event);

            reject(event);
          };

          this.connection.onerror = (error) => {
            console.error(error);

            reject();
          };

          this.connection.onmessage = (event) => {
            const [chName, data] = recognizeMessage(event.data);

            if (chName !== PongChannel) {
              console.info("[ WSClient ][ ON_MESSAGE ]", [chName, data]);
            }

            if (chName === assigment_to_user_of_the_connection_channel) {
              this.handleAssigment({ uid: data.uid, wsid: data.wsid });
            } else if (chName === cancel_assigment_to_user_of_the_connection_channel) {
              this.handleCancelAssigment();
            } else if (chName === PongChannel) {
              this.pong();
            } else if (chName === ErrorChannel) {
              this.emit(wsEventEnum.ERROR, [chName, data]);
            } else {
              this.emit(wsEventEnum.MESSAGE_RECEIVE, [chName, data]);
            }
          };
        });
      });
    } catch (error) {
      console.error(error);

      return Promise.reject();
    }
  }

  public async reconnect(): Promise<void> {
    try {
      return await runInAction<Promise<void>>(`[ ${this.constructor.name} ][ RECONNECT ]`, async () => {
        return await new Promise<void>((resolve, reject) => {
          console.warn(
            `[ ${this.constructor.name} ][ INIT ][ RECONNECT ][ RECONNECT_WILL_THROUGHT: ${
              this.reconnectionDelay
            } ms; ]`,
          );

          this.dropConnectionData();

          this.reconnectTimeOut = window.setTimeout(async () => {
            console.warn(`[ ${this.constructor.name} ][ TRY ][ RECONNECT ]`);

            try {
              await this.connect();
              await this.assigmentToUserOfTheConnection();

              console.warn(`[ ${this.constructor.name} ][ RECONNECT ][ SUCCESS ]`);

              resolve();
            } catch (error) {
              console.error(`[ ${this.constructor.name} ][ RECONNECT ][ ERROR ][ MESSAGE: ${error.message || error} ]`);

              reject();
            } finally {
              window.clearTimeout(this.reconnectTimeOut);
            }
          }, this.reconnectionDelay);
        });
      });
    } catch (error) {
      console.error(error);

      return Promise.reject();
    }
  }

  public async disconnect(reason = "[ DISCONNECT ]"): Promise<void> {
    try {
      // Нужен для того чтобы закрыть соединение ПОЛНОСТЬЮ;

      // Шаг 1: Разъединяем uid и wsid, на этом шаге соединение браузера с сервером ещё активно.
      // Шаг 2: Вызываем метод нативный метод закрытия соединения, на этом шаге соединение разрывается
      //   и сервер очишает всех подписчиков.
      // Шаг 3: все поля в объекте приводятся к значениям по умолчанию и все счетчики сбрасываются.
      // Не используется если CLOSE или ERROR, так как но может быть закрыто или упать с ошибкой по разным
      // причинам. И при CLOSE или ERROR необходимо выполнять reconnect если явно небыл вызыван этот
      // метод disconnect;
      return await new Promise<void>(async (resolve, reject) => {
        try {
          this.once(wsEventEnum.CANCEL_ASSIGMENT, () => {
            if (this.connection instanceof WebSocket) {
              this.connection.close(1000, reason);
            } else {
              throw new Error(`[ ${this.constructor.name} ][ DISCONNECT ][ CONNECTION_IS_NOT_WEB_SOCKET_INSTANCE ]`);
            }
          });

          this.once(wsEventEnum.CLOSE, () => {
            this.dropConnectionData();
            this.uid = "";

            resolve();
          });

          await this.cancelAssigmentToUserOfTheConnection();

          console.log(`[ ${this.constructor.name} ][ DISCONNECT ][ SUCCESS ]`);
        } catch (error) {
          console.error(`[ ${this.constructor.name} ][ DISCONNECT ][ ERROR ][ MESSAGE: ${error.message || error} ]`);

          reject();
        } finally {
          console.log(`[ ${this.constructor.name} ][ DISCONNECT ][ REASON: ${reason} ]`);
          console.log(
            `[ ${this.constructor.name} ][ DISCONNECT ][ CLEAR_LISTENERS ][ LISTENERS_COUNT: ${this.listenersCount} ]`,
          );
        }
      });
    } catch (error) {
      console.error(error);

      return Promise.reject();
    }
  }

  public send(
    channelName: string,
    payload: {
      [key: string]: any;
    },
  ): void {
    try {
      if (this.connection instanceof WebSocket) {
        if (this.isAssigment) {
          this.connection.send(makeMessage(channelName, payload));
        } else {
          console.info(`[ ${this.constructor.name} ][ USER_NOT_ASSIGMENT_WITH_CONNECTION ]`);
        }
      } else {
        throw new Error(`[ ${this.constructor.name} ][ HAS_NOT_CONNECTIONS ]`);
      }
    } catch (error) {
      console.error(error);
    }
  }

  // При login необходимо обьединить uid и wsid;
  public async assigmentToUserOfTheConnection(): Promise<void> {
    try {
      return await new Promise<void>((resolve, reject) => {
        if (this.uid.length > 0) {
          if (!this.isAssigment) {
            if (this.connection instanceof WebSocket) {
              if (this.connection.readyState === WebSocket.OPEN) {
                this.connection.send(makeMessage(assigment_to_user_of_the_connection_channel, { uid: this.uid }));
                this.once(wsEventEnum.ASSIGMENT, resolve);
              } else {
                console.info(`[ ${this.constructor.name} ][ REDY_STATE: ${this.connection.readyState} ]`);

                setTimeout(this.assigmentToUserOfTheConnection, 1000);
              }
            } else {
              console.error(`[ ${this.constructor.name} ][ HAS_NOT_CONNECTION ]`);

              reject();
            }
          } else {
            console.error(`[ ${this.constructor.name} ][ ALREADY_ASSIGMENT ]`);

            reject();
          }
        } else {
          console.error(
            `[ ${
              this.constructor.name
            } ][ USER_ID_FOUND ] you need use method setUserID(uid: string), so insert userID into WSClient;`,
          );

          reject();
        }
      });
    } catch (error) {
      console.error(error);

      return Promise.reject();
    }
  }

  // При logout необходимо разъединить uid и wsid;
  public async cancelAssigmentToUserOfTheConnection(): Promise<void> {
    try {
      return await new Promise<void>((resolve, reject) => {
        if (this.uid.length > 0) {
          if (this.connection instanceof WebSocket && this.isAssigment) {
            this.send(cancel_assigment_to_user_of_the_connection_channel, { uid: this.uid });
            this.once(wsEventEnum.CANCEL_ASSIGMENT, resolve);
          } else {
            console.error(`[ ${this.constructor.name} ][ HAS_NOT CONNECTION | TOKEN | IS_NO_ASSIGMENT ]`);

            reject();
          }
        } else {
          console.error(
            `[ ${
              this.constructor.name
            } ][ USER_ID_FOUND ] you need use method setUserID(uid: string), so insert userID into WSClient;`,
          );

          reject();
        }
      });
    } catch (error) {
      console.error(error);

      return Promise.reject();
    }
  }

  protected handleOpen(): void {
    try {
      this.isAlive = true;
      // console.info("CONNECTION_OPEN", this.isAlive);

      this.headrBeatInterval = window.setInterval(async () => {
        if (this.isAlive) {
          // console.info("HEARD_BEAT", this.isAlive);
          this.isAlive = false;

          this.ping();
        } else {
          clearInterval(this.headrBeatInterval);

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

  @action("[ WSClient ][ ASSIGMENT ]")
  protected handleAssigment({ wsid, uid }: { wsid: string; uid: string }): void {
    try {
      this.readyState = WebSocket.OPEN;
      this.isAssigment = true;
      this.wsid = wsid;
      this.uid = uid;

      this.emit(wsEventEnum.ASSIGMENT, {});
    } catch (error) {
      console.error(error);
    }
  }

  @action("[ WSClient ][ CANCEL_ASSIGMENT ]")
  protected handleCancelAssigment(): void {
    try {
      this.readyState = WebSocket.CLOSED;
      this.isAssigment = false;
      this.wsid = "";

      this.emit(wsEventEnum.CANCEL_ASSIGMENT, {});
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

  protected dropConnectionData(): void {
    try {
      window.clearTimeout(this.reconnectTimeOut);
      window.clearInterval(this.headrBeatInterval);

      this.connection = null;
      this.isAssigment = false;
      this.readyState = WebSocket.CLOSED;
      this.wsid = "";
    } catch (error) {
      console.error(error);
    }
  }
}

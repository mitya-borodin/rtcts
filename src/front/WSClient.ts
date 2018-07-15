import { action, computed, observable } from "mobx";
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

  private uid: string;
  private readonly path: string;
  private readonly reconnectionDelay: number;
  private readonly pingPongDelay: number;
  private connection: WebSocket | null;
  private isAlive: boolean;
  private reconnectTimeOut: number;
  private headrBeatInterval: number;

  constructor(path = "ws", TLS = true, pingPongDelay = 1000, reconnectionDelay = 5000) {
    super();

    this.isAlive = true;

    this.uid = "";

    this.path = `${TLS ? "wss" : "ws"}://${window.location.host}/${path}`;

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

  @action("[ WSClient ][ CONNECT ]")
  public async connect() {
    if (this.connection instanceof WebSocket) {
      if (this.connection.readyState === WebSocket.OPEN) {
        console.log("[ WSClient ][ CONNECTION_ALLREADY_EXIST ]");
        return;
      }

      if (this.connection.readyState !== WebSocket.OPEN) {
        return await this.reconnect();
      }
    }

    this.readyState = WebSocket.CONNECTING;

    await new Promise((resolve, reject) => {
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

        reject(event);
      };

      this.connection.onerror = (error) => {
        console.error(error);

        reject(error);
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
  }

  @action("[ WSClient ][ RECONNECT ]")
  public async reconnect(): Promise<void> {
    await new Promise((resolve, reject) => {
      console.warn(`[ WSClient ][ INIT ][ RECONNECT ][ RECONNECT_WILL_THROUGHT: ${this.reconnectionDelay} ms; ]`);

      this.dropConnectionData();

      this.reconnectTimeOut = window.setTimeout(async () => {
        console.warn("[ WSClient ][ TRY ][ RECONNECT ]");

        try {
          await this.connect();
          await this.assigmentToUserOfTheConnection();

          console.warn("[ WSClient ][ RECONNECT ][ SUCCESS ]");

          resolve();
        } catch (error) {
          console.warn("[ WSClient ][ RECONNECT ][ ERROR ]");

          reject();
        } finally {
          window.clearTimeout(this.reconnectTimeOut);
        }
      }, this.reconnectionDelay);
    });
  }

  public async disconnect(reason = "[ DISCONNECT ]") {
    // Нужен для того чтобы закрыть соединение ПОЛНОСТЬЮ;

    // Шаг 1: Разъединяем uid и wsid, на этом шаге соединение браузера с сервером ещё активно.
    // Шаг 2: Вызываем метод нативный метод закрытия соединения, на этом шаге соединение разрывается
    //   и сервер очишает всех подписчиков.
    // Шаг 3: все поля в объекте приводятся к значениям по умолчанию и все счетчики сбрасываются.
    // Не используется если CLOSE или ERROR, так как но может быть закрыто или упать с ошибкой по разным
    // причинам. И при CLOSE или ERROR необходимо выполнять reconnect если явно небыл вызыван этот
    // метод disconnect;
    await new Promise(async (resolve, reject) => {
      try {
        this.once(wsEventEnum.CANCEL_ASSIGMENT, () => {
          if (this.connection instanceof WebSocket) {
            this.connection.close(1000, reason);
          } else {
            console.error(`[ WSClient ][ DISCONNECT ][ CONNECTION_IS_NOT_WEB_SOCKET_INSTANCE ]`);
          }
        });

        this.once(wsEventEnum.CLOSE, () => {
          this.dropConnectionData();
          this.uid = "";

          resolve();
        });

        await this.cancelAssigmentToUserOfTheConnection();

        console.log(`[ WSClient ][ DISCONNECT ][ SUCCESS ]`);
      } catch (error) {
        console.error(`[ WSClient ][ DISCONNECT ][ ERROR ]`);
        console.error(error);

        reject(error);
      } finally {
        console.log(`[ WSClient ][ DISCONNECT ][ REASON: ${reason} ]`);
        console.log(`[ WSClient ][ DISCONNECT ][ CLEAR_LISTENERS ][ LISTENERS_COUNT: ${this.listenersCount} ]`);
      }
    });
  }

  public send(
    channelName: string,
    payload: {
      [key: string]: any;
    },
  ) {
    if (this.connection instanceof WebSocket) {
      if (this.isAssigment) {
        this.connection.send(makeMessage(channelName, payload));
      } else {
        console.info("[ WSClient ][ USER_NOT_ASSIGMENT_WITH_CONNECTION ]");
      }
    } else {
      console.error("[ WSClient ][ HAS_NOT_CONNECTIONS ]");
    }
  }

  // При login необходимо обьединить uid и wsid;
  public async assigmentToUserOfTheConnection() {
    await new Promise((resolve, reject) => {
      if (this.uid.length > 0) {
        if (!this.isAssigment) {
          if (this.connection instanceof WebSocket) {
            if (this.connection.readyState === WebSocket.OPEN) {
              this.connection.send(makeMessage(assigment_to_user_of_the_connection_channel, { uid: this.uid }));
              this.once(wsEventEnum.ASSIGMENT, resolve);
            } else {
              console.info(`[ WSClient ][ REDY_STATE: ${this.connection.readyState} ]`);

              setTimeout(this.assigmentToUserOfTheConnection, 1000);
            }
          } else {
            console.error("[ WSClient ][ HAS_NOT_CONNECTION ]");

            reject();
          }
        } else {
          console.error("[ WSClient ][ ALREADY_ASSIGMENT ]");

          reject();
        }
      } else {
        console.error(
          "[ WSClient ][ USER_ID_FOUND ] you need use method setUserID(uid: string), so insert userID into WSClient;",
        );

        reject();
      }
    });
  }

  // При logout необходимо разъединить uid и wsid;
  public async cancelAssigmentToUserOfTheConnection() {
    await new Promise((resolve, reject) => {
      if (this.uid.length > 0) {
        if (this.connection instanceof WebSocket && this.isAssigment) {
          this.send(cancel_assigment_to_user_of_the_connection_channel, { uid: this.uid });
          this.once(wsEventEnum.CANCEL_ASSIGMENT, resolve);
        } else {
          console.error("[ WSClient ][ HAS_NOT CONNECTION | TOKEN | IS_NO_ASSIGMENT ]");

          reject();
        }
      } else {
        console.error(
          "[ WSClient ][ USER_ID_FOUND ] you need use method setUserID(uid: string), so insert userID into WSClient;",
        );

        reject();
      }
    });
  }

  private handleOpen() {
    // console.info("CONNECTION_OPEN");

    this.headrBeatInterval = window.setInterval(async () => {
      if (this.isAlive) {
        // console.info("HEARD_BEAT", this.isAlive);
        this.isAlive = false;

        this.ping();
      } else {
        clearInterval(this.headrBeatInterval);

        // console.info("HEARD_BEAT_WRONG", this.isAlive);

        if (this.connection instanceof WebSocket) {
          this.once(wsEventEnum.CLOSE, () => setTimeout(this.reconnect, 100));

          this.connection.close(1000, "The server does not respond on PONG_CHANNEL.");
        } else {
          this.reconnect();
        }
      }
    }, this.pingPongDelay);

    this.emit(wsEventEnum.OPEN);
  }

  @action("[ WSClient ][ ASSIGMENT ]")
  private handleAssigment({ wsid, uid }: { wsid: string; uid: string }) {
    this.readyState = WebSocket.OPEN;
    this.isAssigment = true;
    this.wsid = wsid;
    this.uid = uid;

    this.emit(wsEventEnum.ASSIGMENT, {});
  }

  @action("[ WSClient ][ CANCEL_ASSIGMENT ]")
  private handleCancelAssigment() {
    this.readyState = WebSocket.CLOSED;
    this.isAssigment = false;
    this.wsid = "";

    this.emit(wsEventEnum.CANCEL_ASSIGMENT, {});
  }

  private ping(): void {
    if (this.connection instanceof WebSocket) {
      // console.info("PING");
      this.connection.send(makeMessage(PingChannel, {}));
    }
  }

  private pong() {
    // console.info("PONG");
    this.isAlive = true;
  }

  private dropConnectionData(): void {
    window.clearTimeout(this.reconnectTimeOut);
    window.clearInterval(this.headrBeatInterval);
    this.connection = null;
    this.isAssigment = false;
    this.readyState = WebSocket.CLOSED;
    this.wsid = "";
  }
}

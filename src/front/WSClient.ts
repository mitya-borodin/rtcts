import { action, observable } from "mobx";
import { wsEventEnum } from "../enums/wsEventEnum";
import { IWSClient } from "../interfaces/IWSClient";
import { EventEmitter } from "../isomorphic/EventEmitter";
import { isNumber } from "../utils/isType";
import {
  assigment_to_user_of_the_connection_channel,
  cancel_assigment_to_user_of_the_connection_channel,
  ErrorChannel,
  PingChannel,
  PongChannel,
} from "../WebSocket/const";
import { makeMessage, recognizeMessage } from "../WebSocket/helpers";

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
  private timeout: number;

  constructor(path = "ws", TLS = true, pingPongDelay = 1000, reconnectionDelay = 5000) {
    super();

    this.uid = "";

    this.path = `${TLS ? "wss" : "ws"}://${window.location.host}/${path}`;

    // IS_ALIVE
    this.pingPongDelay = pingPongDelay;

    // RECONNECTION
    this.reconnectionDelay = reconnectionDelay;
    this.timeout = 0;

    // BINDINGS
    this.connect = this.connect.bind(this);
    this.reconnect = this.reconnect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.handleOpen = this.handleOpen.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.assigmentToUserOfTheConnection = this.assigmentToUserOfTheConnection.bind(this);
    this.cancelAssigmentToUserOfTheConnection = this.cancelAssigmentToUserOfTheConnection.bind(this);
    this.handleAssigment = this.handleAssigment.bind(this);
    this.handleCancelAssigment = this.handleCancelAssigment.bind(this);
    this.handleError = this.handleError.bind(this);
  }

  public setUserID(uid: string): void {
    this.uid = uid;
  }

  @action("[ WSClient ][ CONNECT ]")
  public async connect() {
    if (this.connection instanceof WebSocket) {
      throw new Error("[ WSClient ][ CONNECTION_ALLREADY_EXIST ]");
    }

    this.readyState = WebSocket.CONNECTING;

    await new Promise((resolve, reject) => {
      this.connection = new WebSocket(this.path);

      this.connection.onopen = () => {
        this.handleOpen();
        resolve();
      };

      this.connection.onclose = (event) => {
        this.handleClose(event);
        reject();
      };

      this.connection.onerror = this.handleError;

      this.connection.onmessage = (event) => {
        const message = recognizeMessage(event.data);
        console.info("[ WSClient ][ ON_MESSAGE ]", message);

        const [chName, { uid, wsid }] = recognizeMessage(event.data);

        if (chName === assigment_to_user_of_the_connection_channel) {
          super.emit(wsEventEnum.ASSIGMENT, { wsid, uid });
        } else if (chName === cancel_assigment_to_user_of_the_connection_channel) {
          super.emit(wsEventEnum.CANCEL_ASSIGMENT, { wsid, uid });
        } else if (chName === PongChannel) {
          this.pong();
        } else if (chName === ErrorChannel) {
          super.emit(wsEventEnum.ERROR, message);
        } else {
          super.emit(wsEventEnum.MESSAGE_RECEIVE, message);
        }
      };
    });
  }

  @action("[ WSClient ][ RECONNECT ]")
  public reconnect(): void {
    console.log(`[ WSClient ][ INIT ][ RECONNECT ][ RECONNECT_WILL_THROUGHT: ${this.reconnectionDelay} ms; ]`);

    this.dropConnectionData();

    this.timeout = window.setTimeout(async () => {
      console.log("[ WSClient ][ TRY ][ RECONNECT ]");

      try {
        await this.connect();
        await this.assigmentToUserOfTheConnection();

        window.clearTimeout(this.timeout);
        console.log("[ WSClient ][ RECONNECT ][ SUCCESS ]");
      } catch (error) {
        console.log("[ WSClient ][ RECONNECT ][ ERROR ]");

        window.clearTimeout(this.timeout);
        this.handleError(error);
      }
    }, this.reconnectionDelay);
  }

  public async disconnect(reason = "[ DISCONNECT ]") {
    // Нужен для того чтобы правильно проводить LOGOUT;
    // Не используется если CLOSE или ERROR, так как но
    // может быть закрыто или упать с ошибкой по разным
    // причинам.

    await new Promise((resolve) => {
      if (this.connection instanceof WebSocket) {
        super.once(wsEventEnum.CLOSE, (event) => {
          this.uid = "";

          console.log(`[ WSClient ][ DISCONNECT ][ REASON: ${reason} ][ CODE: ${event.code} ]`, event);

          setTimeout(() => {
            // Удаляю все обработчики событий.
            super.clear();

            console.log(`[ WSClient ][ DISCONNECT ][ CLEAR_LISTENERS ][ LISTENERS_COUNT: ${super.listenersCount} ]`);
            resolve();
          }, 100);
        });

        this.connection.close(1000, reason);
      } else {
        super.clear();
        this.uid = "";

        console.log(`[ WSClient ][ DISCONNECT ][ REASON: ${reason} ][ CODE: ${null} ]`);
        console.log(`[ WSClient ][ DISCONNECT ][ CLEAR_LISTENERS ][ LISTENERS_COUNT: ${super.listenersCount} ]`);
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

  public handleOpen() {
    this.setTimer(
      window.setInterval(async () => {
        if (this.isAlive) {
          this.isAlive = false;

          this.ping();
        } else {
          this.clearTimer();

          if (this.connection instanceof WebSocket) {
            super.once(wsEventEnum.CLOSE, this.reconnect);

            this.connection.close(1000, "The server does not respond on PONG_CHANNEL.");
          } else {
            this.reconnect();
          }
        }
      }, this.pingPongDelay),
    );

    super.emit(wsEventEnum.OPEN);
  }

  public handleClose(event) {
    super.emit(wsEventEnum.CLOSE, {});

    if (event.code !== 1000) {
      this.reconnect();
    }
  }

  public handleError(error) {
    console.error(error);

    super.emit(wsEventEnum.CLOSE, {});

    this.reconnect();
  }

  public async assigmentToUserOfTheConnection() {
    if (this.uid.length > 0) {
      await new Promise((resolve, reject) => {
        if (!this.isAssigment) {
          if (this.connection instanceof WebSocket) {
            if (this.connection.readyState === WebSocket.OPEN) {
              this.connection.send(makeMessage(assigment_to_user_of_the_connection_channel, { uid: this.uid }));

              super.once(wsEventEnum.ASSIGMENT, (data) => {
                this.handleAssigment(data);
                resolve();
              });
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
      });
    } else {
      console.error(
        "[ WSClient ][ USER_ID_FOUND ] you need use method setUserID(uid: string), so insert userID into WSClient;",
      );
    }
  }

  public async cancelAssigmentToUserOfTheConnection() {
    if (this.uid.length > 0) {
      await new Promise((resolve, reject) => {
        if (this.connection instanceof WebSocket && this.isAssigment) {
          this.send(cancel_assigment_to_user_of_the_connection_channel, { uid: this.uid });

          super.once(wsEventEnum.CANCEL_ASSIGMENT, () => {
            this.handleCancelAssigment();

            resolve();
          });
        } else {
          console.error("[ WSClient ][ HAS_NOT CONNECTION | TOKEN | IS_NO_ASSIGMENT ]");

          reject();
        }
      });
    } else {
      console.error(
        "[ WSClient ][ USER_ID_FOUND ] you need use method setUserID(uid: string), so insert userID into WSClient;",
      );
    }
  }

  @action("[ WSClient ][ ASSIGMENT ]")
  private handleAssigment({ wsid, uid }) {
    this.readyState = WebSocket.OPEN;
    this.isAssigment = true;
    this.wsid = wsid;
    this.uid = uid;
  }

  @action("[ WSClient ][ CANCEL_ASSIGMENT ]")
  private handleCancelAssigment() {
    this.readyState = WebSocket.CLOSED;
    this.isAssigment = false;
    this.wsid = "";
  }

  private ping(): void {
    if (this.connection instanceof WebSocket) {
      this.connection.send(makeMessage(PingChannel, {}));
    }
  }

  private pong() {
    this.isAlive = true;
  }

  private setTimer(a_timer: number): void {
    this.clearTimer();

    localStorage.setItem("timer", String(a_timer));
  }

  private clearTimer(): void {
    const timer = Number(localStorage.getItem("timer"));

    if (isNumber(timer) && timer > 0) {
      window.clearInterval(timer);
      window.clearTimeout(timer);
    }
  }

  private dropConnectionData(): void {
    window.clearTimeout(this.timeout);
    this.clearTimer();
    this.connection = null;
    this.isAssigment = false;
    this.readyState = WebSocket.CLOSED;
    this.wsid = "";
  }
}

import { action, observable } from "mobx";
import { wsEventEnum } from "../enums/wsEventEnum";
import { IUser } from "../interfaces/IUser";
import { IUserGroup } from "../interfaces/IUserGroup";
import { IUserStore } from "../interfaces/IUserStore";
import { IWSClient } from "../interfaces/IWSClient";
import { EventEmitter } from "../isomorphic/EventEmitter";
import { isNumber, isString } from "../utils/isType";
import {
  assigment_to_user_of_the_connection_channel,
  cancel_assigment_to_user_of_the_connection_channel,
  ErrorChannel,
  PingChannel,
  PongChannel,
} from "../WebSocket/const";
import { makeMessage, recognizeMessage } from "../WebSocket/helpers";

export class WSClient<US extends IUserStore<U, G>, U extends IUser<G>, G extends IUserGroup> extends EventEmitter
  implements IWSClient {
  @observable public readyState = WebSocket.CLOSED;
  @observable public isAssigment = false;
  public wsid: string;
  public uid: string;

  private readonly path: string;
  private readonly reconnectionDelay: number;
  private readonly pingPongDelay: number;
  private readonly userStore: US;
  private connection: WebSocket | null;
  private isAlive: boolean;
  private timeout: number;

  constructor(userStore: US, path = "ws", TLS = true) {
    super();

    this.path = `${TLS ? "wss" : "ws"}://${window.location.host}/${path}`;

    // DEPS
    this.userStore = userStore;

    // IS_ALIVE
    this.pingPongDelay = 1000;

    // RECONNECTION
    this.reconnectionDelay = 5000;
    this.timeout = 0;

    // BINDINGS
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.handleOpen = this.handleOpen.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.assigmentToUserOfTheConnection = this.assigmentToUserOfTheConnection.bind(this);
    this.cancelAssigmentToUserOfTheConnection = this.cancelAssigmentToUserOfTheConnection.bind(this);
    this.handleAssigment = this.handleAssigment.bind(this);
    this.handleCancelAssigment = this.handleCancelAssigment.bind(this);
    this.handleError = this.handleError.bind(this);
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

  @action("[ WSClient ][ RECONNECT ]")
  public reconnect() {
    console.log("[ WSClient ][ INIT ][ TRY ][ RECONNECT ]");

    window.clearTimeout(this.timeout);
    this.clearTimer();
    this.connection = null;
    this.isAssigment = false;
    this.readyState = WebSocket.CONNECTING;
    this.wsid = "";
    this.uid = "";

    this.timeout = window.setTimeout(async () => {
      console.log("[ WSClient ][ TRY ][ RECONNECT ]");

      try {
        await this.connect();

        if (this.userStore.isAuthorized) {
          await this.assigmentToUserOfTheConnection();

          window.clearTimeout(this.timeout);
          console.log("[ WSClient ][ RECONNECT ][ SUCCESS ]");
        }
      } catch (error) {
        console.log("[ WSClient ][ RECONNECT ][ ERROR ]");

        window.clearTimeout(this.timeout);
        this.handleError(error);
      }
    }, this.reconnectionDelay);
  }

  @action("[ WSClient ][ DISCONNECT ]")
  public async disconnect(reason = "Disconnect") {
    await new Promise((resolve) => {
      if (this.connection instanceof WebSocket) {
        this.connection.close(1000, reason);
        // Дублирую для того, чтобы не надеяться на WS события.
        window.clearTimeout(this.timeout);
        this.clearTimer();
        this.connection = null;
        this.isAssigment = false;
        this.readyState = WebSocket.CONNECTING;
        this.wsid = "";
        this.uid = "";

        super.once(wsEventEnum.CLOSE, (event) => {
          console.warn(`[ WSClient ][ DISCONNECT ][ REASON: ${reason} ][ CODE: ${event.code} ]`, event);

          setTimeout(() => {
            super.clear();

            console.warn(`[ WSClient ][ DISCONNECT ][ CLEAR_LISTENERS ][ LISTENERS_COUNT: ${super.listenersCount} ]`);
            resolve();
          }, 0);
        });
      }
    });
  }

  public handleOpen() {
    this.setTimer(
      window.setInterval(async () => {
        if (this.isAlive) {
          this.isAlive = false;

          this.ping();
        } else {
          await this.disconnect("[ WSClient ][ IS_ALLIVE: FALSE ]");
          this.reconnect();
        }
      }, this.pingPongDelay),
    );

    super.emit(wsEventEnum.OPEN);
  }

  @action("[ WSClient ][ HANDLE_CLOSE ]")
  public handleClose(event) {
    window.clearTimeout(this.timeout);
    this.clearTimer();
    this.connection = null;
    this.isAssigment = false;
    this.readyState = WebSocket.CLOSED;
    this.wsid = "";
    this.uid = "";

    super.emit(wsEventEnum.CLOSE, event);

    if (event.code !== 1000) {
      this.reconnect();
    }

    console.warn(event);
  }

  public handleError(error) {
    window.clearTimeout(this.timeout);
    this.clearTimer();
    this.connection = null;
    this.isAssigment = false;
    this.readyState = WebSocket.CLOSED;
    this.wsid = "";
    this.uid = "";

    super.emit(wsEventEnum.CLOSE, event);

    this.reconnect();

    console.error(error);
  }

  public async assigmentToUserOfTheConnection() {
    await new Promise((resolve, reject) => {
      const token = localStorage.getItem("token");

      if (isString(token) && token.length > 0 && !this.isAssigment && this.userStore.isUserData) {
        if (this.connection instanceof WebSocket) {
          if (this.connection.readyState === WebSocket.OPEN) {
            this.connection.send(makeMessage(assigment_to_user_of_the_connection_channel, { token }));

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
        console.error("[ WSClient ][ HAS_NOT_USER ]");

        reject();
      }
    });
  }

  public async cancelAssigmentToUserOfTheConnection() {
    await new Promise((resolve, reject) => {
      const token = localStorage.getItem("token");

      if (
        this.connection instanceof WebSocket &&
        isString(token) &&
        token.length > 0 &&
        this.isAssigment &&
        this.userStore.isUserData
      ) {
        this.send(cancel_assigment_to_user_of_the_connection_channel, { token });

        super.once(wsEventEnum.CANCEL_ASSIGMENT, () => {
          this.handleCancelAssigment();

          resolve();
        });
      } else {
        console.error("[ WSClient ][ HAS_NOT CONNECTION | TOKEN | IS_NO_ASSIGMENT | USER_DATA ]");

        reject();
      }
    });
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
    this.uid = "";
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
}

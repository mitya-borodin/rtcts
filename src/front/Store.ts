import { action, observable } from "mobx";
import { userStoreEventEnum } from "../enums/userStoreEventEnum";
import { wsEventEnum } from "../enums/wsEventEnum";
import { IStore } from "../interfaces/IStore";
import { IUser } from "../interfaces/IUser";
import { IUserGroup } from "../interfaces/IUserGroup";
import { IUserStore } from "../interfaces/IUserStore";
import { IWSClient } from "../interfaces/IWSClient";
import { isFunction } from "../utils/isType";

export class Store<US extends IUserStore<U, G>, U extends IUser<G>, G extends IUserGroup> implements IStore {
  @observable public loading: boolean = false;
  @observable public wasInit: boolean = false;

  protected wsClient: IWSClient;
  protected userStore: US;

  private assigmentHandlers: Set<any>;

  constructor(wsClient: IWSClient, userStore: US) {
    // DEPS
    this.wsClient = wsClient;
    this.userStore = userStore;

    this.assigmentHandlers = new Set();

    // BINDINGS
    this.onLogin = this.onLogin.bind(this);
    this.onLogout = this.onLogout.bind(this);
    this.assigment = this.assigment.bind(this);
  }

  public init(): void {
    this.userStore.on(userStoreEventEnum.LOGIN, this.onLogin);
    this.userStore.on(userStoreEventEnum.LOGOUT, this.onLogout);
  }

  public assigment(handler, emit = true) {
    if (!isFunction(handler)) {
      console.warn("[ STORE ][ BASE ][ ERROR ][ ASSIGMENT_HANDLER_IS_NOT_FUNCTION ]", handler);
    } else if (this.assigmentHandlers.has(handler)) {
      console.warn("[ STORE ][ BASE ][ ERROR ][ ASSIGMENT_HANDLER_ALREADY_EXIST ]", handler);
    } else {
      if (emit) {
        handler();
      }

      this.assigmentHandlers.add(handler);
      this.wsClient.on(wsEventEnum.ASSIGMENT, handler);
    }
  }

  public receiveMessage(message) {
    console.warn("[STORE][BASE][HANDLE_MESSAGE]", message);
  }

  public destroy() {
    this.wasInit = false;
    this.loading = false;
    this.userStore.off(userStoreEventEnum.LOGIN, this.onLogin);
    this.userStore.off(userStoreEventEnum.LOGOUT, this.onLogout);
    this.wsClient.off(wsEventEnum.MESSAGE_RECEIVE, this.receiveMessage);

    this.assigmentHandlers.forEach((handler) => {
      if (this.wsClient.has(wsEventEnum.ASSIGMENT, handler)) {
        this.wsClient.off(wsEventEnum.ASSIGMENT, handler);
      }
    });

    this.assigmentHandlers.clear();

    console.log("[STORE][BASE][DESTROY]");
  }

  @action("[ BASE_STORE ][ START_LOAD ]")
  protected startLoad() {
    this.loading = true;
  }

  @action("[ BASE_STORE ][ END_LOAD ]")
  protected endLoad() {
    this.loading = false;
  }

  private onLogin() {
    if (!this.wsClient.has(wsEventEnum.MESSAGE_RECEIVE, this.receiveMessage)) {
      this.wsClient.on(wsEventEnum.MESSAGE_RECEIVE, this.receiveMessage);
    }
  }

  private onLogout() {
    this.destroy();
  }
}

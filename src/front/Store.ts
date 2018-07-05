import { action, observable } from "mobx";
import { userStoreEventEnum } from "../enums/userStoreEventEnum";
import { wsEventEnum } from "../enums/wsEventEnum";
import { IClientService } from "../interfaces/IClientService";
import { IStore } from "../interfaces/IStore";
import { IUser } from "../interfaces/IUser";
import { IUserGroup } from "../interfaces/IUserGroup";
import { IUserStore } from "../interfaces/IUserStore";
import { IWSClient } from "../interfaces/IWSClient";

export class Store<
  T,
  S extends IClientService<T>,
  US extends IUserStore<U, G>,
  U extends IUser<G>,
  G extends IUserGroup
> implements IStore {
  @observable public loading: boolean = false;
  @observable public wasInit: boolean = false;

  protected wsClient: IWSClient;
  protected userStore: US;
  protected readonly service: S;

  constructor(service: S, wsClient: IWSClient, userStore: US) {
    // DEPS
    this.service = service;
    this.wsClient = wsClient;
    this.userStore = userStore;

    // BINDINGS
    this.onLogin = this.onLogin.bind(this);
    this.onLogout = this.onLogout.bind(this);

    // SUBSCRIPTION
    this.userStore.on(userStoreEventEnum.LOGIN, this.onLogin);
    this.userStore.on(userStoreEventEnum.LOGOUT, this.onLogout);
    this.wsClient.on(wsEventEnum.ASSIGMENT, this.service.onChannel);
  }

  public receiveMessage(message) {
    console.warn("[ BASE_STORE ][ HANDLE_MESSAGE ]", message);
  }

  protected destroy() {
    console.warn("[ BASE_STORE ][ DESTROY ]");

    this.wasInit = false;
    this.loading = false;
    this.wsClient.off(wsEventEnum.MESSAGE_RECEIVE, this.receiveMessage);
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

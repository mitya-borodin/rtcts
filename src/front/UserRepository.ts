import { action, computed, observable, runInAction } from "mobx";
import { userGroupEnum } from "../enums/userGroupEnum";
import { userRepositoryEventEnum } from "../enums/userRepositoryEventEnum";
import { IPersist } from "../interfaces/IPersist";
import { IUser } from "../interfaces/IUser";
import { isString } from "../utils/isType";
import { IMediator } from "./interfaces/IMediator";
import { IUserRepository } from "./interfaces/IUserRepository";
import { IUserService } from "./interfaces/IUserService";
import { IWSClient } from "./interfaces/IWSClient";
import { Repository } from "./Repository";

export class UserRepository<U extends IUser & IPersist> extends Repository<U, IUserService<U>>
  implements IUserRepository<U> {
  protected Persist: { new (data: any): U };

  @observable private currentUserID: string | void;

  constructor(
    Persist: { new (data: any): U },
    service: IUserService<U>,
    wsClient: IWSClient,
    channelName: string,
    mediator: IMediator,
  ) {
    super(Persist, service, wsClient, channelName, mediator);

    // BINDINGS
    this.init = this.init.bind(this);
    this.signIn = this.signIn.bind(this);
    this.signOut = this.signOut.bind(this);
    this.signUp = this.signUp.bind(this);
    this.updateLogin = this.updateLogin.bind(this);
    this.updatePassword = this.updatePassword.bind(this);
    this.updateGroup = this.updateGroup.bind(this);
    this.remove = this.remove.bind(this);
  }

  get isToken() {
    return isString(localStorage.getItem("token"));
  }

  @computed({ name: "[ USER_REPOSITORY ][ ID ]", keepAlive: true })
  get id(): string {
    return isString(this.currentUserID) ? this.currentUserID : "";
  }

  @computed({ name: "[ USER_REPOSITORY ][ USER ]", keepAlive: true })
  get user(): U | void {
    if (isString(this.currentUserID)) {
      const user: U | void = this.map.get(this.currentUserID);

      if (user instanceof this.Persist) {
        this.mediator.emit(userRepositoryEventEnum.SET_USER, user);
        this.mediator.emit(userRepositoryEventEnum.SET_USER_GROUP, user.group);
      }

      return user;
    }
  }

  @computed({ name: "[ USER_REPOSITORY ][ IS_AUTHORIZED ]", keepAlive: true })
  get isAuthorized() {
    return this.user instanceof this.Persist;
  }

  @computed({ name: "[ USER_REPOSITORY ][ IS_ADMIN ]", keepAlive: true })
  get isAdmin() {
    if (this.user instanceof this.Persist) {
      return this.user.group === userGroupEnum.admin;
    }

    return false;
  }

  @action("[ USER_REPOSITORY ][ INIT ]")
  public async init(): Promise<void> {
    if (!this.wasInit) {
      try {
        if (this.isToken) {
          await this.getCurrentUser(); // Загрузка текущего пользователя;
          await super.init(); // Загрузка коллекции;
          runInAction("[ USER_REPOSITORY ][ WAS_INIT ]", () => {
            this.wasInit = true;
          });
        } else {
          this.emit(userRepositoryEventEnum.GO_TO_LOGIN);
        }
      } catch (error) {
        console.error(`[ ${this.constructor.name}  ][ INIT ][ ERROR ]`);
        console.error(error);
      }
    }
  }

  // Шаг 1: Получить токен;
  // Шаг 2: Вызвать метод init;
  @action("[ USER_REPOSITORY ][ SIGN_IN ]")
  public async signIn(data: { [key: string]: any }): Promise<void> {
    if (!this.isAuthorized) {
      try {
        console.time(`[ ${this.constructor.name} ][ SIGN_IN ]`);

        this.startLoad();

        if (isString(data.login) && isString(data.password)) {
          const token: string | void = await this.service.signIn(data);

          if (isString(token)) {
            localStorage.setItem("token", token);

            await this.init();
          }
        }

        console.timeEnd(`[ ${this.constructor.name} ][ SIGN_IN ]`);
      } catch (error) {
        console.error(`[ ${this.constructor.name} ][ SIGN_IN ][ ERROR ]`);
        console.error(error);

        this.destroy();
      } finally {
        this.endLoad();
      }
    }
  }

  // LOGOUT
  // Шаг 1: Проверяем авторизованы мы или нет.
  // Шаг 2: Создаем событие LOGOUT.
  // Шаг 3: Если существует связь uid и wsid её необходимо разорвать.
  // Шаг 4: Даляем из localStorage поле token;
  // Шаг 5: Все поля приводим к значениям по умолчанию;
  @action("[ USER_REPOSITORY ][ SIGN_OUT ]")
  public async signOut(): Promise<void> {
    if (this.isAuthorized) {
      console.time(`[ ${this.constructor.name} ][ SIGN_OUT ]`);

      await new Promise((resolve, reject) => {
        try {
          this.once(userRepositoryEventEnum.LOGOUT, () => {
            setTimeout(async () => {
              if (this.wsClient.isAssigment) {
                await this.wsClient.cancelAssigmentToUserOfTheConnection();
              }

              this.destroy();
              resolve();
            }, 100);
          });

          this.startLoad();
          this.emit(userRepositoryEventEnum.LOGOUT);
        } catch (error) {
          console.error(`[ ${this.constructor.name} ][ LOGOUT ][ ERROR ]`);
          console.error(error);

          reject();
        }
      });

      console.timeEnd(`[ ${this.constructor.name} ][ SIGN_OUT ]`);
    } else {
      console.warn(`[ ${this.constructor.name} ][ LOGOUT ][ NOT_LOGIN ]`);
    }
  }

  @action("[ USER_REPOSITORY ][ SIGN_UP ]")
  public async signUp(data: { [key: string]: any }): Promise<void> {
    try {
      console.time(`[ ${this.constructor.name} ][ SIGN_UP ]`);

      this.startLoad();

      const result: { token: string; user: object } | void = await this.service.signUp(data);

      if (result) {
        const user = new this.Persist(result.user);

        this.map.set(user.id, user);
      }

      console.timeEnd(`[ ${this.constructor.name}  ][ SIGN_UP ]`);
    } catch (error) {
      console.error(`[ ${this.constructor.name} ][ SIGN_UP ][ ERROR ]`);
      console.error(error);

      this.destroy();
    } finally {
      this.endLoad();
    }
  }

  @action("[ USER_REPOSITORY ][ UPDATE_LOGIN ]")
  public async updateLogin(data: { [key: string]: any }): Promise<void> {
    try {
      console.time(`[ ${this.constructor.name} ][ UPDATE_LOGIN ]`);

      this.startLoad();

      if (isString(data.id) && isString(data.login)) {
        let user: U | void = this.map.get(data.id);

        if (user instanceof this.Persist) {
          user = await this.service.updateLogin({ ...user.toJS(), ...data });

          if (user instanceof this.Persist) {
            this.collection.set(user.id, user);
          }
        }
      }

      this.endLoad();

      console.timeEnd(`[ ${this.constructor.name} ][ UPDATE_LOGIN ]`);
    } catch (error) {
      console.error(`[ ${this.constructor.name} ][ UPDATE_LOGIN ][ ERROR ]`);
      console.error(error);
    }
  }

  @action("[ USER_REPOSITORY ][ UPDATE_PASSWORD ]")
  public async updatePassword(data: { [key: string]: any }): Promise<void> {
    try {
      console.time(`[ ${this.constructor.name} ][ UPDATE_PASSWORD ]`);

      this.startLoad();

      if (isString(data.id) && isString(data.password) && isString(data.password_confirm)) {
        let user: U | void = this.map.get(data.id);

        if (user instanceof this.Persist) {
          user = await this.service.updatePassword({ ...user.toJS(), ...data });

          if (user instanceof this.Persist) {
            this.collection.set(user.id, user);
          }
        }
      }

      this.endLoad();

      console.timeEnd(`[ ${this.constructor.name} ][ UPDATE_PASSWORD ]`);
    } catch (error) {
      console.error(`[ ${this.constructor.name} ][ UPDATE_PASSWORD ][ ERROR ]`);
      console.error(error);
    }
  }

  @action("[ USER_REPOSITORY ][ UPDATE_GROUP ]")
  public async updateGroup(ids: string[], updateGroup: string): Promise<void> {
    try {
      console.time(`[ ${this.constructor.name} ][ UPDATE_GROUP ]`);

      this.startLoad();

      const users: U[] | void = await this.service.updateGroup(ids, updateGroup);

      if (Array.isArray(users)) {
        for (const user of users) {
          if (user instanceof this.Persist) {
            this.collection.set(user.id, user);
          } else {
            throw new Error(`Service come back not user instance;`);
          }
        }
      }

      this.endLoad();

      console.timeEnd(`[ ${this.constructor.name} ][ UPDATE_GROUP ]`);
    } catch (error) {
      console.error(`[ ${this.constructor.name} ][ UPDATE_GROUP ][ ERROR ]`);
      console.error(error);
    }
  }

  @action("[ USER_REPOSITORY ][ REMOVE ]")
  public async remove(id: string): Promise<void> {
    try {
      console.time(`[ ${this.constructor.name} ][ REMOVE ]`);

      this.startLoad();
      const user: U | void = await this.service.remove(id);

      if (user instanceof this.Persist) {
        this.collection.delete(user.id);
      }

      this.endLoad();

      console.timeEnd(`[ ${this.constructor.name} ][ REMOVE ]`);
    } catch (error) {
      console.error(`[ ${this.constructor.name} ][ REMOVE ][ ERROR ]`);
      console.error(error);
    }
  }

  @action("[ USER_REPOSITORY ][ DESTROY ]")
  protected destroy() {
    try {
      super.destroy();

      localStorage.removeItem("token");

      this.currentUserID = undefined;

      this.emit(userRepositoryEventEnum.GO_TO_LOGIN);

      this.endLoad();

      this.mediator.emit(userRepositoryEventEnum.CLEAR_USER);
      this.mediator.emit(userRepositoryEventEnum.CLEAR_USER_GROUP);

      console.log(`[ ${this.constructor.name} ][ DESTROY ][ SUCCESS ]`);
    } catch (error) {
      console.error(`[ ${this.constructor.name} ][ DESTROY ][ ERROR ]`);
      console.error(error);
    }
  }

  @action("[ USER_STORE ][ READ_CURRENT_USER ]")
  private async getCurrentUser(): Promise<void> {
    try {
      if (this.isToken) {
        const user: U | void = await this.service.current();

        if (user instanceof this.Persist) {
          await runInAction(`[ ${this.constructor.name} ][ READ_CURRENT_USER ][ SUCCESS ]`, async () => {
            this.currentUserID = user.id;
            this.collection.set(this.currentUserID, user);

            const observableUser = this.collection.get(this.currentUserID);

            if (observableUser instanceof this.Persist) {
              this.mediator.emit(userRepositoryEventEnum.SET_USER, observableUser);
              this.mediator.emit(userRepositoryEventEnum.SET_USER_GROUP, observableUser.group);
            }

            this.wsClient.setUserID(this.currentUserID);

            if (!this.wsClient.isOpen) {
              await this.wsClient.connect();
            }

            if (!this.wsClient.isAssigment) {
              await this.wsClient.assigmentToUserOfTheConnection();
            }

            this.emit(userRepositoryEventEnum.LOGIN);
          });
        } else {
          console.error(
            `[ ${this.constructor.name} ][ READ_CURRENT_USER ][ ERROR ][ USER_IN_NOT_INSTANCEOF ][ ${
              this.Persist.name
            } ]`,
          );
          console.error(user);

          this.destroy();
        }
      } else {
        this.emit(userRepositoryEventEnum.GO_TO_LOGIN);
      }
    } catch (error) {
      console.error(`[ ${this.constructor.name} ][ READ_CURRENT_USER ][ ERROR ]`);
      console.error(error);

      this.destroy();
    } finally {
      this.endLoad();
    }
  }
}

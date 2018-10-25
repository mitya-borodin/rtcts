import { action, computed, observable, runInAction } from "mobx";
import { userGroupEnum } from "../enums/userGroupEnum";
import { userRepositoryEventEnum } from "../enums/userRepositoryEventEnum";
import { IPersist } from "../interfaces/IPersist";
import { IUser } from "../interfaces/IUser";
import { getErrorMessage } from "../utils/getErrorMessage";
import { isString } from "../utils/isType";
import { IMediator } from "./interfaces/IMediator";
import { IUserRepository } from "./interfaces/IUserRepository";
import { IUserService } from "./interfaces/IUserService";
import { IWSClient } from "./interfaces/IWSClient";
import { Repository } from "./Repository";

export class UserRepository<U extends IUser & IPersist, S extends IUserService<U>> extends Repository<U, S>
  implements IUserRepository<U> {
  protected Persist: { new (data: any): U };

  @observable
  private currentUserID: string | void;

  constructor(
    Persist: { new (data: any): U },
    service: S,
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
    if (!this.isInit) {
      try {
        if (this.isToken) {
          await this.getCurrentUser(); // Загрузка текущего пользователя;
          await super.init(); // Загрузка коллекции;

          runInAction("[ USER_REPOSITORY ][ WAS_INIT ]", () => {
            this.isInit = true;
          });
        } else {
          this.mediator.emit(userRepositoryEventEnum.GO_TO_LOGIN);

          return Promise.reject();
        }
      } catch (error) {
        console.error(`[ ${this.constructor.name} ][ INIT ][ ERROR_MESSAGE: ${getErrorMessage(error)} ]`);

        return Promise.reject();
      }
    }
  }

  // Шаг 1: Получить токен;
  // Шаг 2: Вызвать метод init;
  @action("[ USER_REPOSITORY ][ SIGN_IN ]")
  public async signIn(data: { [key: string]: any }): Promise<void> {
    if (!this.isAuthorized) {
      try {
        this.startLoad();

        if (isString(data.login) && isString(data.password)) {
          const token: string | void = await this.service.signIn(data);

          if (isString(token)) {
            localStorage.setItem("token", token);

            await this.init();
          } else {
            this.mediator.emit(userRepositoryEventEnum.LOGIN_FAIL);

            return Promise.reject();
          }
        } else {
          console.error(
            `[ ${this.constructor.name} ][ SIGN_IN ][ ARGS_ERROR ][ login: ${data.login}, password: ${data.password} ]`,
          );

          return Promise.reject();
        }
      } catch (error) {
        console.error(`[ ${this.constructor.name} ][ SIGN_IN ][ ERROR_MESSAGE: ${getErrorMessage(error)} ]`);

        this.destroy();

        this.mediator.emit(userRepositoryEventEnum.LOGIN_FAIL);

        return Promise.reject();
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
      return await new Promise<void>((resolve, reject) => {
        try {
          this.mediator.once(userRepositoryEventEnum.LOGOUT, () => {
            setTimeout(async () => {
              if (this.ws.isAssigment) {
                await this.ws.cancelAssigmentToUserOfTheConnection();
              }

              this.destroy();
              resolve();
            }, 100);
          });

          this.startLoad();
          this.mediator.emit(userRepositoryEventEnum.LOGOUT);
        } catch (error) {
          console.error(`[ ${this.constructor.name} ][ LOGOUT ][ ERROR_MESSAGE: ${getErrorMessage(error)} ]`);

          reject();
        }
      });
    } else {
      console.warn(`[ ${this.constructor.name} ][ LOGOUT ][ NOT_LOGIN ]`);

      return Promise.reject();
    }
  }

  @action("[ USER_REPOSITORY ][ SIGN_UP ]")
  public async signUp(data: { [key: string]: any }): Promise<boolean> {
    try {
      this.startLoad();

      const result: { token: string; user: object } | void = await this.service.signUp(data);

      if (result) {
        const user = new this.Persist(result.user);

        this.map.set(user.id, user);

        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error(`[ ${this.constructor.name} ][ SIGN_UP ][ ERROR_MESSAGE: ${getErrorMessage(error)} ]`);

      this.destroy();

      return Promise.reject();
    } finally {
      this.endLoad();
    }
  }

  @action("[ USER_REPOSITORY ][ UPDATE_LOGIN ]")
  public async updateLogin(data: { [key: string]: any }): Promise<void> {
    try {
      this.startLoad();

      if (isString(data.id) && isString(data.login)) {
        let user: U | void = this.map.get(data.id);

        if (user instanceof this.Persist) {
          user = await this.service.updateLogin({ ...user.toJS(), ...data });

          if (user instanceof this.Persist) {
            this.collection.set(user.id, user);
          } else {
            return Promise.reject();
          }
        } else {
          return Promise.reject();
        }
      } else {
        console.error(
          `[ ${this.constructor.name} ][ UPDATE_LOGIN ][ ARGS_ERROR ][ id: ${data.id}, login: ${data.login} ]`,
        );

        return Promise.reject();
      }
    } catch (error) {
      console.error(`[ ${this.constructor.name} ][ UPDATE_LOGIN ][ ERROR_MESSAGE: ${getErrorMessage(error)} ]`);

      return Promise.reject();
    } finally {
      this.endLoad();
    }
  }

  @action("[ USER_REPOSITORY ][ UPDATE_PASSWORD ]")
  public async updatePassword(data: { [key: string]: any }): Promise<void> {
    try {
      this.startLoad();

      if (isString(data.id) && isString(data.password) && isString(data.password_confirm)) {
        const user = await this.service.updatePassword(data);

        if (user instanceof this.Persist) {
          this.collection.set(user.id, user);
        } else {
          return Promise.reject();
        }
      } else {
        console.warn(
          `[ ${this.constructor.name} ][ UPDATE_PASSWORD ][ ARGS_ERROR ][ id: ${data.id} ][ password: ${
            data.password
          } ][ password_confirm: ${data.password_confirm} ]`,
        );

        return Promise.reject();
      }
    } catch (error) {
      console.error(`[ ${this.constructor.name} ][ UPDATE_PASSWORD ][ ERROR_MESSAGE: ${getErrorMessage(error)} ]`);

      return Promise.reject();
    } finally {
      this.endLoad();
    }
  }

  @action("[ USER_REPOSITORY ][ UPDATE_GROUP ]")
  public async updateGroup(ids: string[], updateGroup: string): Promise<void> {
    try {
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
      } else {
        console.error(`[ ${this.constructor.name} ][ UPDATE_GROUP ][ RESPONSE_ERROR ][ users: ${users} ]`);

        return Promise.reject();
      }
    } catch (error) {
      console.error(`[ ${this.constructor.name} ][ UPDATE_GROUP ][ ERROR_MESSAGE: ${getErrorMessage(error)} ]`);

      return Promise.reject();
    } finally {
      this.endLoad();
    }
  }

  @action("[ USER_REPOSITORY ][ REMOVE ]")
  public async remove(id: string): Promise<void> {
    try {
      this.startLoad();
      const user: U | void = await this.service.remove(id);

      if (user instanceof this.Persist) {
        this.collection.delete(user.id);
      } else {
        throw new Error(`Service come back not user instance;`);
      }
    } catch (error) {
      console.error(`[ ${this.constructor.name} ][ REMOVE ][ ERROR_MESSAGE: ${getErrorMessage(error)} ]`);

      return Promise.reject();
    } finally {
      this.endLoad();
    }
  }

  @action("[ USER_REPOSITORY ][ DESTROY ]")
  protected destroy() {
    try {
      super.destroy();

      localStorage.removeItem("token");

      this.currentUserID = undefined;

      this.endLoad();

      this.mediator.emit(userRepositoryEventEnum.GO_TO_LOGIN);
      this.mediator.emit(userRepositoryEventEnum.CLEAR_USER);
      this.mediator.emit(userRepositoryEventEnum.CLEAR_USER_GROUP);

      console.log(`[ ${this.constructor.name} ][ DESTROY ][ SUCCESS ]`);
    } catch (error) {
      console.error(`[ ${this.constructor.name} ][ DESTROY ][ ERROR_MESSAGE: ${getErrorMessage(error)} ]`);

      return Promise.reject();
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

            this.ws.setUserID(this.currentUserID);

            if (!this.ws.isOpen) {
              await this.ws.connect();
            }

            if (!this.ws.isAssigment) {
              await this.ws.assigmentToUserOfTheConnection();
            }

            this.mediator.emit(userRepositoryEventEnum.LOGIN);
          });
        } else {
          console.error(
            `[ ${this.constructor.name} ][ READ_CURRENT_USER ][ ERROR ][ USER_IN_NOT_INSTANCEOF ][ ${
              this.Persist.name
            } ]`,
          );
          console.error(user);

          this.destroy();

          this.mediator.emit(userRepositoryEventEnum.LOGIN_FAIL);
        }
      } else {
        this.mediator.emit(userRepositoryEventEnum.GO_TO_LOGIN);
      }
    } catch (error) {
      console.error(`[ ${this.constructor.name} ][ READ_CURRENT_USER ][ ERROR_MESSAGE: ${getErrorMessage(error)} ]`);

      this.destroy();

      return Promise.reject();
    } finally {
      this.endLoad();
    }
  }
}

import { IEntity, IUser, userGroupEnum, userRepositoryEventEnum } from "@borodindmitriy/interfaces";
import { IMediator } from "@borodindmitriy/isomorphic";
import { getErrorMessage, isString } from "@borodindmitriy/utils";
import { action, computed, observable, runInAction } from "mobx";
import { IWSClient } from "../../interfaces/transport/ws/IWSClient";
import { IUserHTTPTransport } from "../../interfaces/user/IUserHTTPTransport";
import { IUserRepository } from "../../interfaces/user/IUserRepository";
import { Repository } from "../repository/Repository";

export class UserRepository<E extends IUser & IEntity, T extends IUserHTTPTransport<E>>
  extends Repository<E, T>
  implements IUserRepository<E> {
  protected Entity: new (data: any) => E;

  @observable
  private currentUserID: string | undefined;

  constructor(
    Entity: new (data: any) => E,
    transport: T,
    wsClient: IWSClient,
    channelName: string,
    mediator: IMediator,
  ) {
    super(Entity, transport, mediator, wsClient, channelName);

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

  @computed({ name: "[ USER_REPOSITORY ][ ID ]" })
  get id(): string {
    return isString(this.currentUserID) ? this.currentUserID : "";
  }

  @computed({ name: "[ USER_REPOSITORY ][ USER ]" })
  get user(): E | void {
    if (isString(this.currentUserID)) {
      const user: E | void = this.map.get(this.currentUserID);

      if (user instanceof this.Entity) {
        this.mediator.emit(userRepositoryEventEnum.SET_USER, user);
        this.mediator.emit(userRepositoryEventEnum.SET_USER_GROUP, user.group);
      }

      return user;
    }
  }

  @computed({ name: "[ USER_REPOSITORY ][ IS_AUTHORIZED ]" })
  get isAuthorized() {
    return this.user instanceof this.Entity || isString(this.isToken);
  }

  @computed({ name: "[ USER_REPOSITORY ][ IS_ADMIN ]" })
  get isAdmin() {
    if (this.user instanceof this.Entity) {
      return this.user.group === userGroupEnum.admin;
    }

    return false;
  }

  @action("[ USER_REPOSITORY ][ INIT ]")
  public async init(): Promise<void> {
    if (!this.isInit) {
      try {
        this.start();

        if (this.isToken) {
          await this.getCurrentUser(); // ! Загрузка текущего пользователя;

          if (this.transport.ACL.collection.includes(this.transport.group)) {
            await super.init(); // ! Загрузка коллекции;
          }

          runInAction(`[ ${this.constructor.name} ][ SUCCESS ]`, () => (this.isInit = true));
        } else {
          this.mediator.emit(userRepositoryEventEnum.GO_TO_LOGIN);

          throw new Error(`TOKEN_IS_MISSING`);
        }
      } catch (error) {
        console.error(`[ ${this.constructor.name} ][ INIT ][ ${getErrorMessage(error)} ]`);

        return Promise.reject();
      } finally {
        this.stop();
      }
    }
  }

  // Шаг 1: Получить токен;
  // Шаг 2: Вызвать метод init;
  @action("[ USER_REPOSITORY ][ SIGN_IN ]")
  public async signIn(data: { [key: string]: any }): Promise<void> {
    if (!this.isAuthorized) {
      try {
        this.start();

        if (isString(data.login) && isString(data.password)) {
          const token: string | void = await this.transport.signIn(data);

          if (isString(token)) {
            localStorage.setItem("token", token);

            await this.init();
          } else {
            throw new Error(`TOKEN_IS_MISSING`);
          }
        } else {
          throw new Error(`data failed: { login: ${data.login}, password: ${data.password} }`);
        }
      } catch (error) {
        console.error(`[ ${this.constructor.name} ][ SIGN_IN ][ ${getErrorMessage(error)} ]`);

        this.destroy();

        this.mediator.emit(userRepositoryEventEnum.LOGIN_FAIL);

        return Promise.reject();
      } finally {
        this.stop();
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
    try {
      this.start();

      if (this.isAuthorized) {
        await new Promise<void>((resolve, reject) => {
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

            this.start();
            this.mediator.emit(userRepositoryEventEnum.LOGOUT);
          } catch (error) {
            reject(error);
          }
        });
      } else {
        throw new Error("NOT_LOGINED");
      }
    } catch (error) {
      console.error(`[ ${this.constructor.name} ][ SIGN_OUT ][ ${getErrorMessage(error)} ]`);

      return Promise.reject();
    } finally {
      this.stop();
    }
  }

  @action("[ USER_REPOSITORY ][ SIGN_UP ]")
  public async signUp(data: { [key: string]: any }): Promise<boolean> {
    try {
      this.start();

      const result: { token: string; user: object } | void = await this.transport.signUp(data);

      if (result) {
        runInAction(`[ ${this.constructor.name} ][ SUCCESS ]`, () => {
          const user = new this.Entity(result.user);

          this.map.set(user.id, user);
        });

        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error(`[ ${this.constructor.name} ][ SIGN_UP ][ ${getErrorMessage(error)} ]`);

      this.destroy();

      return Promise.reject();
    } finally {
      this.stop();
    }
  }

  @action("[ USER_REPOSITORY ][ UPDATE_LOGIN ]")
  public async updateLogin(data: { [key: string]: any }): Promise<void> {
    try {
      this.start();

      if (isString(data.id) && isString(data.login)) {
        const cur_user: E | void = this.map.get(data.id);

        if (cur_user instanceof this.Entity) {
          const entity: E | void = await this.transport.updateLogin({
            ...cur_user.toJS(),
            ...data,
          });

          if (entity instanceof this.Entity) {
            runInAction(`[ ${this.constructor.name} ][ SUCCESS ]`, () =>
              this.collection.set(entity.id, entity),
            );
          } else {
            throw new Error(
              `ITEM IS NOT ${this.Entity.name} - ${Object.prototype.toString.call(entity)}`,
            );
          }
        } else {
          throw new Error("USER_NOT_FOUND");
        }
      } else {
        throw new Error(`data failed: { id: ${data.id}, login: ${data.login} }`);
      }
    } catch (error) {
      console.error(`[ ${this.constructor.name} ][ UPDATE_LOGIN ][ ${getErrorMessage(error)} ]`);

      return Promise.reject();
    } finally {
      this.stop();
    }
  }

  @action("[ USER_REPOSITORY ][ UPDATE_PASSWORD ]")
  public async updatePassword(data: { [key: string]: any }): Promise<void> {
    try {
      this.start();

      if (isString(data.id) && isString(data.password) && isString(data.password_confirm)) {
        const entity = await this.transport.updatePassword(data);

        if (entity instanceof this.Entity) {
          runInAction(`[ ${this.constructor.name} ][ SUCCESS ]`, () =>
            this.collection.set(entity.id, entity),
          );
        } else {
          throw new Error(
            `ITEM IS NOT ${this.Entity.name} - ${Object.prototype.toString.call(entity)}`,
          );
        }
      } else {
        throw new Error(
          `data failed: { password: ${data.password}, password_confirm: ${data.password_confirm} }`,
        );
      }
    } catch (error) {
      console.error(`[ ${this.constructor.name} ][ UPDATE_PASSWORD ][ ${getErrorMessage(error)} ]`);

      return Promise.reject();
    } finally {
      this.stop();
    }
  }

  @action("[ USER_REPOSITORY ][ UPDATE_GROUP ]")
  public async updateGroup(ids: string[], updateGroup: string): Promise<void> {
    try {
      this.start();

      const collection: E[] | void = await this.transport.updateGroup(ids, updateGroup);

      if (Array.isArray(collection)) {
        runInAction(`[ ${this.constructor.name} ][ SUCCESS ]`, () => {
          for (const user of collection) {
            if (user instanceof this.Entity) {
              this.collection.set(user.id, user);
            } else {
              throw new Error(
                `ITEM IS NOT ${this.Entity.name} - ${Object.prototype.toString.call(user)}`,
              );
            }
          }
        });
      } else {
        throw new Error(`COLLECTION IS NOT ARRAY - ${Object.prototype.toString.call(collection)}`);
      }
    } catch (error) {
      console.error(`[ ${this.constructor.name} ][ UPDATE_GROUP ][ ${getErrorMessage(error)} ]`);

      return Promise.reject();
    } finally {
      this.stop();
    }
  }

  @action("[ USER_REPOSITORY ][ REMOVE ]")
  public async remove(id: string): Promise<void> {
    try {
      this.start();

      const user: E | void = await this.transport.remove(id);

      if (user instanceof this.Entity) {
        runInAction(`[ ${this.constructor.name} ][ SUCCESS ]`, () =>
          this.collection.delete(user.id),
        );
      } else {
        throw new Error(
          `ITEM IS NOT ${this.Entity.name} - ${Object.prototype.toString.call(user)}`,
        );
      }
    } catch (error) {
      console.error(`[ ${this.constructor.name} ][ REMOVE ][ ${getErrorMessage(error)} ]`);

      return Promise.reject();
    } finally {
      this.stop();
    }
  }

  @action("[ USER_REPOSITORY ][ DESTROY ]")
  protected destroy(): void {
    try {
      super.destroy();

      localStorage.removeItem("token");

      this.currentUserID = undefined;

      this.stop();

      this.mediator.emit(userRepositoryEventEnum.GO_TO_LOGIN);
      this.mediator.emit(userRepositoryEventEnum.CLEAR_USER);
      this.mediator.emit(userRepositoryEventEnum.CLEAR_USER_GROUP);

      console.log(`[ ${this.constructor.name} ][ DESTROY ][ SUCCESS ]`);
    } catch (error) {
      console.error(`[ ${this.constructor.name} ][ DESTROY ][ ${getErrorMessage(error)} ]`);
    }
  }

  @action("[ USER_STORE ][ READ_CURRENT_USER ]")
  private async getCurrentUser(): Promise<void> {
    try {
      if (this.isToken) {
        const entity: E | void = await this.transport.current();

        if (entity instanceof this.Entity) {
          await runInAction(`[ ${this.constructor.name} ][ SUCCESS ]`, async () => {
            this.currentUserID = entity.id;
            this.collection.set(this.currentUserID, entity);

            const observableUser = this.collection.get(this.currentUserID);

            if (observableUser instanceof this.Entity) {
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
          throw new Error(
            `ITEM IS NOT ${this.Entity.name} - ${Object.prototype.toString.call(entity)}`,
          );
        }
      } else {
        throw new Error(`TOKEN_IS_MISSING`);
      }
    } catch (error) {
      console.error(
        `[ ${this.constructor.name} ][ READ_CURRENT_USER ][ ${getErrorMessage(error)} ]`,
      );

      this.destroy();

      this.mediator.emit(userRepositoryEventEnum.LOGIN_FAIL);
      this.mediator.emit(userRepositoryEventEnum.GO_TO_LOGIN);

      return Promise.reject();
    } finally {
      this.stop();
    }
  }
}

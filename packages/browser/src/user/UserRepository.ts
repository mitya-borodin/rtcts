import {
  Response,
  User,
  UserData,
  userEventEnum,
  userGroupEnum,
  ListResponse,
} from "@rtcts/isomorphic";
import { getErrorMessage, isString } from "@rtcts/utils";
import EventEmitter from "eventemitter3";
import { action, computed, observable, runInAction } from "mobx";
import { Repository } from "../repository/Repository";
import { WSClient } from "../transport/ws/WSClient";
import { UserHTTPTransport } from "./UserHTTPTransport";

export class UserRepository<
  HTTP_TRANSPORT extends UserHTTPTransport<ENTITY, DATA, VA, WS, PUB_SUB>,
  ENTITY extends User<DATA, VA>,
  DATA extends UserData = UserData,
  VA extends object = object,
  WS extends WSClient = WSClient,
  PUB_SUB extends EventEmitter = EventEmitter
> extends Repository<HTTP_TRANSPORT, ENTITY, DATA, VA, WS, PUB_SUB> {
  protected Entity: new (data?: any) => ENTITY;

  @observable
  private user: ENTITY | undefined;

  constructor(
    httpTransport: HTTP_TRANSPORT,
    Entity: new (data?: any) => ENTITY,
    wsClient: WS,
    channelName: string,
    pubSub: PUB_SUB,
  ) {
    super(httpTransport, Entity, wsClient, channelName, pubSub);

    this.Entity = Entity;

    // ! BINDINGS
    this.init = this.init.bind(this);
    this.signIn = this.signIn.bind(this);
    this.signOut = this.signOut.bind(this);
    this.signUp = this.signUp.bind(this);
    this.updateLogin = this.updateLogin.bind(this);
    this.updatePassword = this.updatePassword.bind(this);
    this.updateGroup = this.updateGroup.bind(this);
    this.remove = this.remove.bind(this);
  }

  @computed({ name: "UserRepository.id" })
  get id(): string | undefined {
    return this.user instanceof this.Entity ? this.user.id : undefined;
  }

  @computed({ name: "UserRepository.group" })
  get group(): string | undefined {
    return this.user instanceof this.Entity ? this.user.group : undefined;
  }

  @computed({ name: "UserRepository.isAdmin" })
  get isAdmin(): boolean {
    if (this.user instanceof this.Entity) {
      return this.user.group === userGroupEnum.admin;
    }

    return false;
  }

  @computed({ name: "UserRepository.isAuthorized" })
  get isAuthorized(): boolean {
    return isString(this.id);
  }

  @action("UserRepository.init")
  public async init(): Promise<void> {
    if (this.isInit) {
      return;
    }

    try {
      this.start();

      // ! Для того, чтобы понять авторизованы мы или нет, нам необходимо попытаться скачать данные
      // ! текущего пользователя.
      // ! Если таких данных не было загружено, то необходимо ввести логин и пароль.
      await this.fetchCurrentUser();

      if (this.isAuthorized) {
        // * Загружаем список пользователей если для текущей роли это доступно.
        if (this.httpTransport.ACL.collection.includes(this.httpTransport.currentUserGroup)) {
          // ? Вызываем метод из родительского класса так как при инициализации он загружает
          // ? коллекцию entities
          await super.init();
        }

        // * Завершаем процедуру инициализации
        runInAction(
          `Initialization (${this.constructor.name}) has been succeed`,
          () => (this.isInit = true),
        );
      } else {
        this.pubSub.emit(userEventEnum.GO_TO_SIGN_IN);
      }
    } catch (error) {
      console.error(
        `Initialization (${this.constructor.name}) has been failed: ${getErrorMessage(error)}`,
      );
    } finally {
      this.stop();
    }
  }

  // * SIGN_IN
  // * Шаг 0: Проверяем, что логин и пароль введены верно.
  // * Шаг 1: Выполняем вход по логину и паролю.
  // * Шаг 2: Выполняем инициализацию хранилища пользователей.
  @action("UserRepository.signIn")
  public async signIn(data: { [key: string]: any }): Promise<void> {
    try {
      if (!isString(data.login) || !isString(data.password)) {
        throw new Error(`login of password isn't string: ${JSON.stringify(data)}`);
      }

      this.start();

      await this.httpTransport.signIn(data);
      await this.init();
    } catch (error) {
      console.error(`SignIn (${this.constructor.name}) has been failed: ${getErrorMessage(error)}`);

      this.destroy();

      this.pubSub.emit(userEventEnum.SIGN_IN_FAIL);
    } finally {
      this.stop();
    }
  }

  // * SIGN_OUT
  // * Шаг 1: Проверяем входили ли мы в систему.
  // * Шаг 2: Одноразово подписываемся на событие SIGN_OUT.
  // * Шаг 3: Если текущий пользователь связан с web socket соединением, то необходимо разорвать связь.
  // * Шаг 4: Вызываем метод сервера который перезапишет cookie
  // * Шаг 5: Возбуждаем событие SIGN_OUT, так как все обработчики будут вызваны синхронно,
  // *        то наш обработчик выполнится последним.
  @action("UserRepository.signOut")
  public async signOut(): Promise<void> {
    try {
      if (!this.isAuthorized) {
        throw new Error(`you are not signed in`);
      }

      this.start();

      await new Promise<void>((resolve, reject) => {
        try {
          this.pubSub.once(userEventEnum.SIGN_OUT, () => {
            setTimeout(async () => {
              if (this.ws.isUserBindToConnection) {
                await this.ws.unbindUserFromConnection();
              }

              await this.httpTransport.signOut();

              this.destroy();
              resolve();
            }, 1000);
          });

          this.start();
          this.pubSub.emit(userEventEnum.SIGN_OUT);
        } catch (error) {
          reject(error);
        }
      });
    } catch (error) {
      console.error(
        `SignOut (${this.constructor.name}) has been failed: ${getErrorMessage(error)}`,
      );
    } finally {
      this.stop();
    }
  }

  @action("UserRepository.signUp")
  public async signUp(data: { [key: string]: any }, onlyCreate = false): Promise<void> {
    try {
      const { login, password, passwordConfirm, group } = data;

      if (
        !isString(login) ||
        !isString(password) ||
        !isString(passwordConfirm) ||
        !isString(group)
      ) {
        throw new Error(`signUp data isn't correct: ${JSON.stringify(data)}`);
      }

      this.start();

      if (onlyCreate) {
        const response: Response<ENTITY> | void = await this.httpTransport.create(data);
        if (!response) {
          throw new Error(`response is empty`);
        }

        const entity = response.result;

        if (!entity.isEntity()) {
          return;
        }

        runInAction(`Create (${this.constructor.name}) has been succeed`, () => {
          this.collection.set(entity.id, entity);
        });
      } else {
        await this.httpTransport.signUp(data);
        await this.init();
      }
    } catch (error) {
      console.error(`SignUp (${this.constructor.name}) has been failed: ${getErrorMessage(error)}`);

      this.destroy();
    } finally {
      this.stop();
    }
  }

  @action("UserRepository.updateLogin")
  public async updateLogin(data: { [key: string]: any }): Promise<void> {
    try {
      const { id, login } = data;

      if (!isString(id) || !isString(login)) {
        throw new Error(`updateLogin data isn't correct: ${JSON.stringify(data)}`);
      }

      this.start();

      const targetUser: ENTITY | void = this.map.get(data.id);

      if (!targetUser) {
        throw new Error(`user by id: ${data.id} not found`);
      }

      const response: Response<ENTITY> | void = await this.httpTransport.updateLogin({
        ...targetUser.toObject(),
        ...data,
      });

      if (!response) {
        throw new Error(`response is empty`);
      }

      const entity = response.result;

      if (!entity.isEntity()) {
        return;
      }

      runInAction(`UpdateLogin (${this.constructor.name}) has been succeed`, () => {
        this.collection.set(entity.id, entity);
      });
    } catch (error) {
      console.error(
        `UpdateLogin (${this.constructor.name}) has been failed: ${getErrorMessage(error)}`,
      );
    } finally {
      this.stop();
    }
  }

  @action("UserRepository.updatePassword")
  public async updatePassword(data: { [key: string]: any }): Promise<void> {
    try {
      const { id, password, passwordConfirm } = data;

      if (!isString(id) || !isString(password) || !isString(passwordConfirm)) {
        throw new Error(`updatePassword data isn't correct: ${JSON.stringify(data)}`);
      }

      this.start();

      const response: Response<ENTITY> | void = await this.httpTransport.updatePassword(data);

      if (!response) {
        throw new Error(`response is empty`);
      }

      const entity = response.result;

      if (!entity.isEntity()) {
        return;
      }

      runInAction(`UpdatePassword (${this.constructor.name}) has been succeed`, () =>
        this.collection.set(entity.id, entity),
      );
    } catch (error) {
      console.error(
        `UpdatePassword (${this.constructor.name}) has been failed: ${getErrorMessage(error)}`,
      );
    } finally {
      this.stop();
    }
  }

  @action("UserRepository.updateGroup")
  public async updateGroup(ids: string[], updateGroup: string): Promise<void> {
    try {
      this.start();

      const listResponse: ListResponse<ENTITY> | void = await this.httpTransport.updateGroup(
        ids,
        updateGroup,
      );

      if (!listResponse) {
        throw new Error(`listResponse is empty`);
      }

      runInAction(`UpdateGroup (${this.constructor.name}) has been succeed`, () => {
        for (const user of listResponse.results) {
          if (!user.isEntity()) {
            continue;
          }

          this.collection.set(user.id, user);
        }
      });
    } catch (error) {
      console.error(
        `UpdateGroup (${this.constructor.name}) has been failed: ${getErrorMessage(error)}`,
      );
    } finally {
      this.stop();
    }
  }

  @action("UserRepository.remove")
  public async remove(id: string): Promise<void> {
    try {
      this.start();

      const response: Response<ENTITY> | void = await this.httpTransport.remove(id);

      if (!response) {
        throw new Error(`response is empty`);
      }

      const entity = response.result;

      if (!entity.isEntity()) {
        return;
      }

      runInAction(`Remove (${this.constructor.name}) has been succeed`, () =>
        this.collection.delete(entity.id),
      );
    } catch (error) {
      console.error(`Remove (${this.constructor.name}) has been failed: ${getErrorMessage(error)}`);
    } finally {
      this.stop();
    }
  }

  @action("UserRepository.destroy")
  protected destroy(): void {
    try {
      super.destroy();

      this.user = undefined;

      this.pubSub.emit(userEventEnum.GO_TO_SIGN_IN);
      this.pubSub.emit(userEventEnum.CLEAR_USER);
      this.pubSub.emit(userEventEnum.CLEAR_USER_GROUP);

      console.log(`Destroy ${this.constructor.name} has been succeed`);

      this.stop();
    } catch (error) {
      console.error(
        `Destroy (${this.constructor.name}) has been failed: ${getErrorMessage(error)}`,
      );
    }
  }

  @action("UserRepository.fetchCurrentUser")
  private async fetchCurrentUser(): Promise<void> {
    try {
      const response: Response<ENTITY> | void = await this.httpTransport.current();

      if (!response) {
        throw new Error(`response is empty`);
      }

      const entity = response.result;

      if (!entity.isEntity()) {
        return;
      }

      await runInAction(
        `fetchCurrentUser (${this.constructor.name}) has been succeed`,
        async () => {
          this.user = entity;
          this.collection.set(entity.id, entity);

          const observableUser = this.collection.get(entity.id);

          if (observableUser instanceof this.Entity && observableUser.checkNoSecureFields()) {
            this.pubSub.emit(userEventEnum.SET_USER, observableUser);
            this.pubSub.emit(userEventEnum.SET_USER_GROUP, observableUser.group);
          }

          this.ws.setUserID(entity.id);

          if (!this.ws.isOpen) {
            await this.ws.connect();
          }

          if (!this.ws.isUserBindToConnection) {
            await this.ws.bindUserToConnection();
          }

          this.pubSub.emit(userEventEnum.SIGN_IN);
        },
      );
    } catch (error) {
      console.error(
        `fetchCurrentUser (${this.constructor.name}) has been failed: ${getErrorMessage(error)}`,
      );

      this.destroy();

      this.pubSub.emit(userEventEnum.SIGN_IN_FAIL);
      this.pubSub.emit(userEventEnum.GO_TO_SIGN_IN);
    } finally {
      this.stop();
    }
  }
}

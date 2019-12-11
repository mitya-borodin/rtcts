import { User, UserData, userGroupEnum } from "@rtcts/isomorphic";
import { ObjectId } from "bson";
import * as jwt from "jsonwebtoken";
import { FindOneAndReplaceOption, FindOneOptions } from "mongodb";
import { Model } from "./Model";
import { MongoDBRepository } from "./MongoDBRepository";
import { isString, checkPassword } from "@rtcts/utils";
import { AppConfig } from "../app/AppConfig";

export class UserModel<
  UE extends User<VA>,
  VA extends any[] = any[],
  AC extends AppConfig = AppConfig
> extends Model<UE, UserData, VA> {
  protected config: AC;

  constructor(
    repository: MongoDBRepository<UE, UserData, VA>,
    Entity: new (data: any) => UE,
    send: (
      payload: { [key: string]: any },
      uid: string,
      wsid: string,
      excludeCurrentDevice?: boolean,
    ) => void,
    config: AC,
  ) {
    super(repository, Entity, send);

    this.config = config;
  }

  public async getUsers(): Promise<Required<Pick<UE, "id" | "login" | "group">>[]> {
    try {
      const items: UE[] = await super.read();

      return items.map((item) => {
        if (item.isEntity()) {
          return { id: item.id, login: item.login, group: item.group };
        }

        throw new Error("The User object data is incorrect");
      });
    } catch (error) {
      console.error(error);
    }

    return [];
  }

  public async getUserById(
    id: string,
  ): Promise<Required<Pick<UE, "id" | "login" | "group"> | null>> {
    try {
      const item = await super.readById(id);

      if (item && item.isEntity()) {
        return { id: item.id, login: item.login, group: item.group };
      }
    } catch (error) {
      console.error(error);
    }

    return null;
  }

  public async init(): Promise<void> {
    try {
      const result: UE | null = await this.repository.findOne({});

      if (result === null) {
        await this.signUp({
          group: userGroupEnum.admin,
          login: "admin@admin.com",
          password: "admin",
          password_confirm: "admin",
        });
      }
    } catch (error) {
      console.error(error);
    }
  }

  public async signUp(data: { [key: string]: any }): Promise<{ token: string; user: object }> {
    try {
      const { login, password, password_confirm, group, ...other } = data;

      if (isString(login) && isString(password) && isString(password_confirm) && isString(group)) {
        const existingUser: any | null = await this.repository.findOne({ login });

        if (existingUser === null) {
          const isValidPassword = checkPassword(password, password_confirm);

          if (isValidPassword) {
            const salt = getSalt();
            const hashed_password = encryptPassword(password, salt);
            const insert = new this.Insert({ login, group, salt, hashed_password, ...other });

            const user: P = await this.repository.insertOne(insert.toJS());

            return {
              token: jwt.sign({ _id: user.id }, this.config.jwt.secretKey),
              user: new this.Persist(user).toJSSecure(),
            };
          }

          return Promise.reject(isValidPassword);
        } else {
          return Promise.reject(`[ USER_ALREADY_EXIST][ login: ${data.login} ]`);
        }
      } else {
        return Promise.reject(
          `[ INCORRECT_ARGS ][ login: ${data.login} ][ password: ${data.password} ]` +
            `[ password_confirm: ${data.password_confirm} ][ group: ${data.group} ]`,
        );
      }
    } catch (error) {
      console.error(error);

      return Promise.reject(error);
    }
  }

  public async signIn(data: { [key: string]: any }): Promise<string | null> {
    try {
      if (isString(data.login) && isString(data.password)) {
        const user: P | null = await this.repository.findOne({ login: data.login });

        if (user !== null) {
          if (authenticate(data.password, user.salt, user.hashed_password)) {
            return jwt.sign({ id: user.id }, this.config.jwt.secretKey);
          } else {
            return Promise.reject(`[ PASSWORD_INCORRECT ][ password: ${data.password} ]`);
          }
        } else {
          return Promise.reject(`[ USER_NOT_FOUND ][ login: ${data.login} ]`);
        }
      } else {
        return Promise.reject(
          `[ INCORRECT_ARGS ][ login: ${data.login} ][ password: ${data.password} ]`,
        );
      }
    } catch (error) {
      console.error(error);

      return Promise.reject(error);
    }
  }

  public async updateLogin(
    data: { [key: string]: any },
    uid: string,
    wsid: string,
  ): Promise<P | null> {
    try {
      if (isString(data.id) && isString(data.login)) {
        const result: object | null = await this.repository.findOne({ _id: new ObjectId(data.id) });

        if (result) {
          return await super.update({ ...result, login: data.login }, uid, wsid);
        } else {
          return Promise.reject(`[ USER_NOT_FOUND ][ ID: ${data.id} ][ login: ${data.login} ]`);
        }
      } else {
        return Promise.reject(`[ INCORRECT_PROPS ][ ID: ${data.id} ][ login: ${data.login} ]`);
      }
    } catch (error) {
      console.error(error);

      return Promise.reject(error);
    }
  }

  public async updatePassword(
    data: { [key: string]: any },
    uid: string,
    wsid: string,
  ): Promise<P | null> {
    try {
      if (isString(data.id) && isString(data.password) && isString(data.password_confirm)) {
        const isValidPassword = checkPassword(data.password, data.password_confirm);

        if (isValidPassword) {
          const result: object | null = await this.repository.findOne({
            _id: new ObjectId(data.id),
          });

          if (result) {
            const salt = getSalt();
            const hashed_password = encryptPassword(data.password, salt);

            return await super.update({ ...result, salt, hashed_password }, uid, wsid, {
              projection: { salt: 0, hashed_password: 0 },
            });
          }

          return null;
        } else {
          return Promise.reject(
            `[ INCORRECT_PASSWORD ][ ID: ${data.id} ][ password: ${data.password} ]` +
              `[ password_confirm: ${data.password_confirm} ]`,
          );
        }
      } else {
        return Promise.reject(
          `[ INCORRECT_PROPS ][ ID: ${data.id} ][ password: ${data.password} ]` +
            `[ password_confirm: ${data.password_confirm} ]`,
        );
      }
    } catch (error) {
      console.error(error);

      return Promise.reject(error);
    }
  }

  public async updateGroup(
    ids: string[],
    group: IUserGroup,
    uid: string,
    wsid: string,
  ): Promise<P[]> {
    try {
      const query = { _id: { $in: ids.map((id) => new ObjectId(id)) } };

      await this.repository.updateMany(query, { $set: { group } });

      const users = await super.read(query);

      this.send({ bulkUpdate: users.map((u) => u.toJSSecure()) }, uid, wsid);

      return users;
    } catch (error) {
      console.error(error);

      return Promise.reject(error);
    }
  }

  public async update(
    data: { [key: string]: any },
    uid: string,
    wsid: string,
    options?: FindOneAndReplaceOption,
  ): Promise<P | null> {
    try {
      const incomeUser: P = new this.Persist(data);
      const currentUser = await this.readById(incomeUser.id);

      if (currentUser instanceof this.Persist) {
        // console.log({ ...currentUser.toJS(), ...incomeUser.toJSSecure() });

        // Так как я заменяю весь объект мне нужно сохранить секретные поля, salt, hashed_password;
        return await super.update(
          { ...currentUser.toJS(), ...incomeUser.toJSSecure() },
          uid,
          wsid,
          options,
        );
      }

      return null;
    } catch (error) {
      console.error(error);

      return Promise.reject(error);
    }
  }
}

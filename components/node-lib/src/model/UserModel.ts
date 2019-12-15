import { User, UserData, userGroupEnum } from "@rtcts/isomorphic";
import { ObjectId } from "bson";
import * as jwt from "jsonwebtoken";
import { FindOneAndReplaceOption } from "mongodb";
import { Model } from "./Model";
import { MongoDBRepository } from "./MongoDBRepository";
import { isString, checkPassword } from "@rtcts/utils";
import { AppConfig } from "../app/AppConfig";
import { getSalt } from "../utils/getSalt";
import { encryptPassword } from "../utils/encryptPassword";
import omit from "lodash.omit";
import { authenticate } from "../utils/authenticate";

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

  public async getUsers(): Promise<UE[]> {
    return await super.read();
  }

  public async getUserById(id: string): Promise<UE | null> {
    return await super.readById(id);
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

  public async signUp(data: {
    [key: string]: any;
  }): Promise<{ token: string; user: object } | null> {
    try {
      const { login, password, password_confirm, group, ...other } = data;

      if (isString(login) && isString(password) && isString(password_confirm) && isString(group)) {
        const existingUser: any | null = await this.repository.findOne({ login });

        if (existingUser === null) {
          const isValidPassword = checkPassword(password, password_confirm);

          if (isValidPassword) {
            const salt = getSalt();
            const hashedPassword = encryptPassword(password, salt);
            const insert = new this.Entity({ login, group, salt, hashedPassword, ...other });

            if (insert.canBeInsert()) {
              const user: UE | null = await this.repository.insertOne(insert);

              if (user && user.isEntity()) {
                return {
                  token: jwt.sign({ _id: user.id }, this.config.jwt.secretKey),
                  user: omit(user.toObject(), ["salt", "hashedPassword"]),
                };
              }
            }
          }

          throw new Error(
            `Password incorrect, { password: ${password}, password_confirm: ${password_confirm} }`,
          );
        } else {
          throw new Error(`[ USER_ALREADY_EXIST ][ login: ${data.login} ]`);
        }
      } else {
        throw new Error(
          `[ INCORRECT_ARGS ][ login: ${data.login} ][ password: ${data.password} ]` +
            `[ password_confirm: ${data.password_confirm} ][ group: ${data.group} ]`,
        );
      }
    } catch (error) {
      console.error(error);
    }

    return null;
  }

  public async signIn(data: { [key: string]: any }): Promise<string | null> {
    try {
      if (isString(data.login) && isString(data.password)) {
        const user: UE | null = await this.repository.findOne({ login: data.login });

        if (user !== null && user.canBeInsert()) {
          if (authenticate(data.password, user.salt, user.hashedPassword)) {
            return jwt.sign({ id: user.id }, this.config.jwt.secretKey);
          } else {
            throw new Error(`[ PASSWORD_INCORRECT ][ password: ${data.password} ]`);
          }
        } else {
          throw new Error(`[ USER_NOT_FOUND ][ login: ${data.login} ]`);
        }
      } else {
        throw new Error(`[ INCORRECT_ARGS ][ login: ${data.login} ][ password: ${data.password} ]`);
      }
    } catch (error) {
      console.error(error);
    }

    return null;
  }

  public async updateLogin(
    data: { [key: string]: any },
    uid: string,
    wsid: string,
  ): Promise<UE | null> {
    try {
      if (isString(data.id) && isString(data.login)) {
        const result: UE | null = await this.repository.findOne({ _id: new ObjectId(data.id) });

        if (result) {
          return await super.update({ ...result, login: data.login }, uid, wsid);
        } else {
          throw new Error(`[ USER_NOT_FOUND ][ ID: ${data.id} ][ login: ${data.login} ]`);
        }
      } else {
        throw new Error(`[ INCORRECT_PROPS ][ ID: ${data.id} ][ login: ${data.login} ]`);
      }
    } catch (error) {
      console.error(error);
    }

    return null;
  }

  public async updatePassword(
    data: { [key: string]: any },
    uid: string,
    wsid: string,
  ): Promise<UE | null> {
    try {
      if (isString(data.id) && isString(data.password) && isString(data.password_confirm)) {
        const isValidPassword = checkPassword(data.password, data.password_confirm);

        if (isValidPassword) {
          const result: UE | null = await this.repository.findOne({ _id: new ObjectId(data.id) });

          if (result) {
            const salt = getSalt();
            const hashedPassword = encryptPassword(data.password, salt);

            return await super.update({ ...result, salt, hashedPassword }, uid, wsid, {
              projection: { salt: 0, hashedPassword: 0 },
            });
          }
        } else {
          throw new Error(
            `[ INCORRECT_PASSWORD ][ ID: ${data.id} ][ password: ${data.password} ]` +
              `[ password_confirm: ${data.password_confirm} ]`,
          );
        }
      } else {
        throw new Error(
          `[ INCORRECT_PROPS ][ ID: ${data.id} ][ password: ${data.password} ]` +
            `[ password_confirm: ${data.password_confirm} ]`,
        );
      }
    } catch (error) {
      console.error(error);
    }

    return null;
  }

  public async updateGroup(ids: string[], group: string, uid: string, wsid: string): Promise<UE[]> {
    try {
      const query = { _id: { $in: ids.map((id) => new ObjectId(id)) } };

      await this.repository.updateMany(query, { $set: { group } });

      const users = await super.read(query);

      this.send(
        {
          bulkUpdate: users.map((user) => {
            if (user.canBeInsert()) {
              return { id: user.id, login: user.login, group: user.group };
            }

            return user;
          }),
        },
        uid,
        wsid,
      );

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
  ): Promise<UE | null> {
    try {
      const insert: UE = new this.Entity(data);

      if (insert.isEntity()) {
        const currentUser: UE | null = await this.readById(insert.id);

        if (currentUser) {
          return await super.update(
            {
              ...currentUser.toObject(),
              ...omit(insert.toObject(), "salt", "hashedPassword"),
            },
            uid,
            wsid,
            options,
          );
        }
      }
    } catch (error) {
      console.error(error);
    }

    return null;
  }
}

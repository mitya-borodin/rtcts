import { Send, User, UserData, userGroupEnum } from "@rtcts/isomorphic";
import { checkPassword, isString } from "@rtcts/utils";
import { ObjectId } from "bson";
import jwt from "jsonwebtoken";
import omit from "lodash.omit";
import { FindOneAndReplaceOption } from "mongodb";
import { Config } from "../app/Config";
import { authenticate } from "../utils/authenticate";
import { encryptPassword } from "../utils/encryptPassword";
import { getSalt } from "../utils/getSalt";
import { Model } from "./Model";
import { MongoDBRepository } from "./MongoDBRepository";

export class UserModel<
  UE extends User<VA>,
  VA extends any[] = any[], // Validate Arguments
  C extends Config = Config
> extends Model<UE, UserData, VA> {
  protected config: C;

  constructor(
    repository: MongoDBRepository<UE, UserData, VA>,
    Entity: new (data: any) => UE,
    send: Send,
    config: C,
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

  public async signUp(data: { [key: string]: any }): Promise<string | null> {
    try {
      const { login, password, password_confirm, group, ...other } = data;

      if (isString(login) && isString(password) && isString(password_confirm) && isString(group)) {
        const existingUser: UE | null = await this.repository.findOne({ login });

        if (existingUser === null) {
          const isValidPassword = checkPassword(password, password_confirm);

          if (isValidPassword) {
            const salt = getSalt();
            const hashedPassword = encryptPassword(password, salt);
            const insert = new this.Entity({ login, group, salt, hashedPassword, ...other });

            if (insert.canBeInsert()) {
              const user: UE | null = await this.repository.insertOne(insert);

              if (user && user.isEntity()) {
                const { secretKey } = this.config.jwt;

                return jwt.sign(user.id, secretKey, { expiresIn: "12h" });
              }
            }
          }

          throw new Error(
            `Password incorrect, { password: ${password}, password_confirm: ${password_confirm} }`,
          );
        } else {
          throw new Error(`[ USER ALREADY EXIST ][ login: ${data.login} ]`);
        }
      } else {
        throw new Error(
          `[ INCORRECT ARGS ][ login: ${data.login} ][ password: ${data.password} ]` +
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

        if (user && user.isEntity()) {
          if (authenticate(data.password, user.salt, user.hashedPassword)) {
            const { secretKey } = this.config.jwt;

            return jwt.sign(user.id, secretKey, { expiresIn: "12h" });
          }

          throw new Error(`[ PASSWORD INCORRECT ][ password: ${data.password} ]`);
        }

        throw new Error(`[ USER NOT FOUND ][ login: ${data.login} ]`);
      }

      throw new Error(`[ INCORRECT ARGS ][ login: ${data.login} ][ password: ${data.password} ]`);
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

        if (result && result.isEntity()) {
          return await super.update({ ...result, login: data.login }, uid, wsid);
        }

        throw new Error(`[ USER NOT FOUND ][ ID: ${data.id} ][ login: ${data.login} ]`);
      }

      throw new Error(`[ INCORRECT_PROPS ][ ID: ${data.id} ][ login: ${data.login} ]`);
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

          if (result && result.isEntity()) {
            const salt = getSalt();
            const hashedPassword = encryptPassword(data.password, salt);
            const query = { ...result, salt, hashedPassword };
            const options = {
              projection: { salt: 0, hashedPassword: 0 },
            };

            return await super.update(query, uid, wsid, options);
          }
        }

        throw new Error(
          `[ INCORRECT_PASSWORD ][ ID: ${data.id} ][ password: ${data.password} ]` +
            `[ password_confirm: ${data.password_confirm} ]`,
        );
      }

      throw new Error(
        `[ INCORRECT_PROPS ][ ID: ${data.id} ][ password: ${data.password} ]` +
          `[ password_confirm: ${data.password_confirm} ]`,
      );
    } catch (error) {
      console.error(error);
    }

    return null;
  }

  public async updateGroup(
    ids: string[],
    group: string,
    uid: string,
    wsid: string,
    excludeCurrentDevice: boolean = true,
  ): Promise<UE[]> {
    try {
      const query = { _id: { $in: ids.map((id) => new ObjectId(id)) } };
      const update = { $set: { group } };

      await this.repository.updateMany(query, update);

      const users: UE[] = await super.read(query);

      this.send(
        {
          bulkUpdate: users.map((user) => {
            if (user.isEntity()) {
              return { id: user.id, login: user.login, group: user.group };
            }

            return user;
          }),
        },
        uid,
        wsid,
        excludeCurrentDevice,
      );

      return users;
    } catch (error) {
      console.error(error);
    }

    return [];
  }

  // ! The update method is used to change user data that does not affect access control, such as avatar, name, and other data
  public async update(
    data: { [key: string]: any },
    uid: string,
    wsid: string,
    options?: FindOneAndReplaceOption,
  ): Promise<UE | null> {
    try {
      const insert: UE = new this.Entity(data);

      if (insert.checkNoSecure() && isString(insert.id)) {
        const currentUser: UE | null = await this.readById(insert.id);

        if (currentUser) {
          return await super.update(
            {
              ...currentUser.toObject(),
              ...omit(insert.getUnSecureData(), ["group"]),
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

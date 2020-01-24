/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Send,
  User,
  UserData,
  userGroupEnum,
  ListResponse,
  Response,
  ValidateResult,
} from "@rtcts/isomorphic";
import { checkPassword, isString } from "@rtcts/utils";
import { ObjectId } from "bson";
import jwt from "jsonwebtoken";
import omit from "lodash.omit";
import { FindOneAndReplaceOption, FindOneOptions, CollectionInsertOneOptions } from "mongodb";
import { Config } from "../app/Config";
import { authenticate } from "../utils/authenticate";
import { encryptPassword } from "../utils/encryptPassword";
import { getSalt } from "../utils/getSalt";
import { Model } from "./Model";
import { MongoDBRepository } from "./MongoDBRepository";

export class UserModel<
  E extends User<VA>,
  VA extends any[] = any[], // Validate Arguments
  C extends Config = Config
> extends Model<E, UserData, VA> {
  protected config: C;

  constructor(
    repository: MongoDBRepository<E, UserData, VA>,
    Entity: new (data: any) => E,
    sendThroughWebSocket: Send,
    config: C,
  ) {
    super(repository, Entity, sendThroughWebSocket);

    this.config = config;
  }

  // ! Response API
  public async getListResponse(offset = 0, limit = 20): Promise<ListResponse> {
    const results: E[] = await this.repository.find({}, offset, limit);

    return new ListResponse({
      count: results.length,
      results: results.map((item) => item.getUnSecureData()),
      validates: new ValidateResult(),
    });
  }

  public async getItemResponse(id: string, options?: FindOneOptions): Promise<Response> {
    const result: E | null = await this.repository.findById(id, options);

    return new Response({
      result: result !== null ? result.getUnSecureData() : result,
      validates: new ValidateResult(),
    });
  }

  public async createResponse(
    data: object,
    uid: string,
    wsid: string,
    options?: CollectionInsertOneOptions,
    excludeCurrentDevice = true,
  ): Promise<Response> {
    const result: E | null = await super.create(data, uid, wsid, options, excludeCurrentDevice);

    return new Response({
      result: result !== null ? result.getUnSecureData() : result,
      validates: new ValidateResult(),
    });
  }

  public async updateResponse(
    data: object,
    uid: string,
    wsid: string,
    options?: CollectionInsertOneOptions,
    excludeCurrentDevice = true,
  ): Promise<Response> {
    const result: E | null = await super.update(data, uid, wsid, options, excludeCurrentDevice);

    return new Response({
      result: result !== null ? result.getUnSecureData() : result,
      validates: new ValidateResult(),
    });
  }

  public async removeResponse(
    id: string,
    uid: string,
    wsid: string,
    options?: { projection?: object; sort?: object },
    excludeCurrentDevice = true,
  ): Promise<Response> {
    const result: E | null = await super.remove(id, uid, wsid, options, excludeCurrentDevice);

    return new Response({
      result: result !== null ? result.getUnSecureData() : result,
      validates: new ValidateResult(),
    });
  }

  public async updateLoginResponse(
    data: { [key: string]: any },
    uid: string,
    wsid: string,
  ): Promise<Response> {
    const result: E | null = await this.updateLogin(data, uid, wsid);

    return new Response({
      result: result !== null ? result.getUnSecureData() : result,
      validates: new ValidateResult(),
    });
  }

  public async updatePasswordResponse(
    data: { [key: string]: any },
    uid: string,
    wsid: string,
  ): Promise<Response> {
    const result: E | null = await this.updatePassword(data, uid, wsid);

    return new Response({
      result: result !== null ? result.getUnSecureData() : result,
      validates: new ValidateResult(),
    });
  }

  public async updateGroupResponse(
    ids: string[],
    group: string,
    uid: string,
    wsid: string,
    excludeCurrentDevice = true,
    offset = 0,
    limit = 1000,
  ): Promise<ListResponse> {
    const results: E[] | null = await this.updateGroup(
      ids,
      group,
      uid,
      wsid,
      excludeCurrentDevice,
      offset,
      limit,
    );

    return new ListResponse({
      count: results.length,
      results: results.map((result) => result.getUnSecureData()),
      validates: new ValidateResult(),
    });
  }

  // ! Model API

  public async getUsers(offset = 0, limit = 20): Promise<E[]> {
    return await await this.repository.find({}, offset, limit);
  }

  public async getUserById(id: string): Promise<E | null> {
    return await this.repository.findById(id);
  }

  public async init(): Promise<void> {
    try {
      const result: E | null = await this.repository.findOne({});

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
        const existingUser: E | null = await this.repository.findOne({ login });

        if (existingUser === null) {
          const isValidPassword = checkPassword(password, password_confirm);

          if (isValidPassword) {
            const salt = getSalt();
            const hashedPassword = encryptPassword(password, salt);
            const insert = new this.Entity({ login, group, salt, hashedPassword, ...other });

            if (insert.canBeInsert()) {
              const user: E | null = await this.repository.insertOne(insert);

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
        const user: E | null = await this.repository.findOne({ login: data.login });

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
  ): Promise<E | null> {
    try {
      if (isString(data.id) && isString(data.login)) {
        const result: E | null = await this.repository.findOne({ _id: new ObjectId(data.id) });

        if (result && result.isEntity()) {
          return await super.update({ ...result.toObject(), login: data.login }, uid, wsid);
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
  ): Promise<E | null> {
    try {
      if (isString(data.id) && isString(data.password) && isString(data.password_confirm)) {
        const isValidPassword = checkPassword(data.password, data.password_confirm);

        if (isValidPassword) {
          const result: E | null = await this.repository.findOne({ _id: new ObjectId(data.id) });

          if (result && result.isEntity()) {
            const salt = getSalt();
            const hashedPassword = encryptPassword(data.password, salt);
            const query = { ...result.toObject(), salt, hashedPassword };

            return await super.update(query, uid, wsid);
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
    excludeCurrentDevice = true,
    offset = 0,
    limit = 1000,
  ): Promise<E[]> {
    try {
      const query = { _id: { $in: ids.map((id) => new ObjectId(id)) } };
      const update = { $set: { group } };

      await this.repository.updateMany(query, update);

      const users: E[] = await super.repository.find(query, offset, limit);

      this.sendThroughWebSocket(
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
    data: object,
    uid: string,
    wsid: string,
    options?: FindOneAndReplaceOption,
  ): Promise<E | null> {
    try {
      const insert: E = new this.Entity(data);

      if (insert.checkNoSecure() && isString(insert.id)) {
        const currentUser: E | null = await this.repository.findById(insert.id);

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

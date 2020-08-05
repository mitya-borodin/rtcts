import {
  ListResponse,
  Response,
  Send,
  User,
  userGroupEnum,
  ValidationResult,
} from "@rtcts/isomorphic";
import { checkPassword, isString } from "@rtcts/utils";
import { ObjectId } from "bson";
import jwt from "jsonwebtoken";
import omit from "lodash.omit";
import { FindOneOptions } from "mongodb";
import { Config } from "../app/Config";
import { authenticate } from "../utils/authenticate";
import { encryptPassword } from "../utils/encryptPassword";
import { getSalt } from "../utils/getSalt";
import { Model } from "./Model";
import { MongoDBRepository } from "./MongoDBRepository";

export class UserModel<ENTITY extends User, CONFIG extends Config = Config> extends Model<ENTITY> {
  protected config: CONFIG;

  constructor(
    Entity: new (data: any) => ENTITY,
    repository: MongoDBRepository<ENTITY>,
    sendThroughWebSocket: Send,
    config: CONFIG,
  ) {
    super(Entity, repository, sendThroughWebSocket);

    this.config = config;
  }

  // ! Response API
  public async getListResponse(offset = 0, limit = 20): Promise<ListResponse> {
    const payload: ENTITY[] = await this.repository.find({}, offset, limit);

    return new ListResponse({
      count: payload.length,
      payload: payload.map((item) => item.getUnSecureData()),
      validationResult: new ValidationResult([]),
    });
  }

  public async getItemResponse(id: string, options?: FindOneOptions): Promise<Response> {
    const payload: ENTITY | null = await this.repository.findById(id, options);

    return new Response({
      payload: payload !== null ? payload.getUnSecureData() : payload,
      validationResult: new ValidationResult([]),
    });
  }

  public async createResponse(
    data: object,
    uid: string,
    wsid: string,
    excludeRequestingDevice = true,
  ): Promise<Response> {
    const payload: ENTITY | null = await super.create(data, uid, wsid, excludeRequestingDevice);

    return new Response({
      payload: payload !== null ? payload.getUnSecureData() : payload,
      validationResult: new ValidationResult([]),
    });
  }

  public async updateResponse(
    data: object,
    uid: string,
    wsid: string,
    excludeRequestingDevice = true,
  ): Promise<Response> {
    const payload: ENTITY | null = await super.update(data, uid, wsid, excludeRequestingDevice);

    return new Response({
      payload: payload !== null ? payload.getUnSecureData() : payload,
      validationResult: new ValidationResult([]),
    });
  }

  public async removeResponse(
    id: string,
    uid: string,
    wsid: string,
    excludeRequestingDevice = true,
  ): Promise<Response> {
    const payload: ENTITY | null = await super.remove(id, uid, wsid, excludeRequestingDevice);

    return new Response({
      payload: payload !== null ? payload.getUnSecureData() : payload,
      validationResult: new ValidationResult([]),
    });
  }

  public async updateLoginResponse(
    data: { [key: string]: any },
    uid: string,
    wsid: string,
  ): Promise<Response> {
    const payload: ENTITY | null = await this.updateLogin(data, uid, wsid);

    return new Response({
      payload: payload !== null ? payload.getUnSecureData() : payload,
      validationResult: new ValidationResult([]),
    });
  }

  public async updatePasswordResponse(
    data: { [key: string]: any },
    uid: string,
    wsid: string,
  ): Promise<Response> {
    const payload: ENTITY | null = await this.updatePassword(data, uid, wsid);

    return new Response({
      payload: payload !== null ? payload.getUnSecureData() : payload,
      validationResult: new ValidationResult([]),
    });
  }

  public async updateGroupResponse(
    ids: string[],
    group: string,
    uid: string,
    wsid: string,
    excludeRequestingDevice = true,
    offset = 0,
    limit = 1000,
  ): Promise<ListResponse> {
    const payload: ENTITY[] | null = await this.updateGroup(
      ids,
      group,
      uid,
      wsid,
      excludeRequestingDevice,
      offset,
      limit,
    );

    return new ListResponse({
      count: payload.length,
      payload: payload.map((payload) => payload.getUnSecureData()),
      validationResult: new ValidationResult([]),
    });
  }

  // ! Model API
  public async getUsers(offset = 0, limit = 20): Promise<ENTITY[]> {
    return await this.repository.find({}, offset, limit);
  }

  public async getUserById(id: string): Promise<ENTITY | null> {
    return await this.repository.findById(id);
  }

  public async init(): Promise<void> {
    try {
      const payload: ENTITY | null = await this.repository.findOne({});

      if (payload === null) {
        await this.signUp({
          group: userGroupEnum.admin,
          login: "admin@admin.com",
          password: "admin",
          passwordConfirm: "admin",
        });
      }
    } catch (error) {
      console.error(error);
    }
  }

  public async signUp(
    data: { [key: string]: any },
    onlyCreate = false,
  ): Promise<string | Response | null> {
    try {
      const { login, password, passwordConfirm, group, ...other } = data;

      if (
        !isString(login) ||
        !isString(password) ||
        !isString(passwordConfirm) ||
        !isString(group)
      ) {
        throw new Error(`Incorrect signUp data: ${JSON.stringify(data)}`);
      }

      const existingUser: ENTITY | null = await this.repository.findOne({ login });

      if (existingUser !== null) {
        throw new Error(`User with login: ${data.login} already exist`);
      }

      const isValidPassword = checkPassword(password, passwordConfirm);

      if (!isValidPassword) {
        throw new Error(`Password incorrect, ${JSON.stringify({ password, passwordConfirm })} }`);
      }

      const salt = getSalt();
      const hashedPassword = encryptPassword(password, salt);
      const insert = new this.Entity({ login, group, salt, hashedPassword, ...other });

      if (insert.isInsert()) {
        const user: ENTITY | null = await this.repository.insertOne(insert);

        if (user && user.isEntity()) {
          if (onlyCreate) {
            return new Response({
              payload: user.getUnSecureData(),
              validationResult: new ValidationResult([]),
            });
          } else {
            return jwt.sign({ id: user.id }, this.config.jwt.secretKey, { expiresIn: "12h" });
          }
        }
      }
    } catch (error) {
      console.error(error);
    }

    return null;
  }

  public async signIn(data: { [key: string]: any }): Promise<string | null> {
    try {
      if (!isString(data.login) || !isString(data.password)) {
        throw new Error(`Incorrect signIn data: ${JSON.stringify(data)}`);
      }

      const user: ENTITY | null = await this.repository.findOne({ login: data.login });

      if (user === null) {
        throw new Error(`User with login: ${data.login} not found`);
      }

      if (user.isEntity()) {
        if (!authenticate(data.password, user.salt, user.hashedPassword)) {
          throw new Error(`Incorrect signIn data: ${JSON.stringify(data)}`);
        }

        return jwt.sign({ id: user.id }, this.config.jwt.secretKey, { expiresIn: "12h" });
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
  ): Promise<ENTITY | null> {
    try {
      if (!isString(data.id) || !isString(data.login)) {
        throw new Error(`Incorrect updateLogin data: ${JSON.stringify(data)}`);
      }

      const payload: ENTITY | null = await this.repository.findOne({ _id: new ObjectId(data.id) });

      if (payload === null) {
        throw new Error(`User with id: ${data.id} and login: ${data.login} not found`);
      }

      if (payload.isEntity()) {
        const updatedEntity = new this.Entity({ ...payload.toObject(), login: data.login });

        if (!updatedEntity.isEntity()) {
          throw new Error(`Updated entity wrong`);
        }

        return await super.update(updatedEntity.toObject(), uid, wsid);
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
  ): Promise<ENTITY | null> {
    try {
      if (!isString(data.id) || !isString(data.password) || !isString(data.passwordConfirm)) {
        throw new Error(`Incorrect updatePassword data: ${JSON.stringify(data)}`);
      }

      const isValidPassword = checkPassword(data.password, data.passwordConfirm);

      if (!isValidPassword) {
        throw new Error(`Incorrect password: ${JSON.stringify(data)}`);
      }

      const payload: ENTITY | null = await this.repository.findOne({ _id: new ObjectId(data.id) });

      if (payload === null) {
        throw new Error(`User with id: ${data.id} not found`);
      }

      if (payload.isEntity()) {
        const salt = getSalt();
        const hashedPassword = encryptPassword(data.password, salt);
        const query = { ...payload.toObject(), salt, hashedPassword };

        return await super.update(query, uid, wsid);
      }
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
    excludeRequestingDevice = true,
    offset = 0,
    limit = 1000,
  ): Promise<ENTITY[]> {
    try {
      const query = { _id: { $in: ids.map((id) => new ObjectId(id)) } };
      const update = { $set: { group } };

      await this.repository.updateMany(query, update);

      const users: ENTITY[] = await this.repository.find(query, offset, limit);

      this.sendThroughWebSocket(
        {
          bulkUpdate: users.map((user) => {
            if (user.isEntity()) {
              return user.getUnSecureData();
            }

            return user;
          }),
        },
        uid,
        wsid,
        excludeRequestingDevice,
      );

      return users;
    } catch (error) {
      console.error(error);
    }

    return [];
  }

  // ! The update method is used to change user data that does not affect access control, such as avatar, name, and other data
  public async update(data: object, uid: string, wsid: string): Promise<ENTITY | null> {
    try {
      const insert: ENTITY = new this.Entity(data);

      if (insert.isEntity()) {
        const currentUser: ENTITY | null = await this.repository.findById(insert.id);

        if (currentUser) {
          return await super.update(
            {
              ...currentUser.toObject(),
              ...omit(insert.getUnSecureData(), ["group"]),
            },
            uid,
            wsid,
          );
        }
      }
    } catch (error) {
      console.error(error);
    }

    return null;
  }
}
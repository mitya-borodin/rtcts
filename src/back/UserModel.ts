import { ObjectId } from "bson";
import * as jwt from "jsonwebtoken";
import { userGroupEnum } from "../enums/userGroupEnum";
import { IPersist } from "../interfaces/IPersist";
import { IUser } from "../interfaces/IUser";
import { IUserGroup } from "../interfaces/IUserGroup";
import { authenticate } from "../utils/authenticate";
import { checkPassword } from "../utils/checkPassword";
import { encryptPassword } from "../utils/encryptPassword";
import { getSalt } from "../utils/getSalt";
import { isString } from "../utils/isType";
import { IAppConfig } from "./interfaces/IAppConfig";
import { IRepository } from "./interfaces/IRepository";
import { IUserModel } from "./interfaces/IUserModel";
import { Model } from "./Model";

export class UserModel<P extends IUser & IPersist, I extends IUser> extends Model<P, I> implements IUserModel<P, I> {
  protected config: IAppConfig;

  constructor(
    repository: IRepository<P>,
    Persist: { new (data?: any): P },
    Insert: { new (data?: any): I },
    send: (payload: object, uid: string, wsid: string, excludeCurrentDevice?: boolean) => void,
    config: IAppConfig,
  ) {
    super(repository, Persist, Insert, send);

    this.config = config;
  }

  public async read(query = {}, options = {}, uid = "") {
    if (isString(uid) && uid.length > 0) {
      return await super.read(
        { _id: new ObjectId(uid) },
        { projection: { login: 1, group: 1, firstName: 1, lastName: 1 } },
      );
    }

    return [];
  }

  public async readAll() {
    return await super.read({}, { projection: { login: 1, group: 1, firstName: 1, lastName: 1 } });
  }

  public async init() {
    const result: any | null = await this.repository.findOne({});

    if (result === null) {
      await this.signUp({
        group: userGroupEnum.admin,
        login: "admin@admin.com",
        password: "admin",
        password_confirm: "admin",
      });
    }
  }

  public async signUp(data: { [key: string]: any }): Promise<{ token: string; user: object }> {
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
            token: jwt.sign({ _id: user.id }, this.config.jwt.secret_key),
            user: new this.Persist(user).toJSSecure(),
          };
        }

        return Promise.reject(isValidPassword);
      } else {
        throw new Error(`Пользователь с таким: ${login} login уже зарегистрирован.`);
      }
    }

    return Promise.reject(
      `[ INCORRECT_PROPS ][ login: ${data.login} ][ password: ${data.password} ]` +
        `[ password_confirm: ${data.password_confirm} ][ group: ${data.group} ]`,
    );
  }

  public async signIn(data: { [key: string]: any }): Promise<string | null> {
    if (isString(data.login) && isString(data.password)) {
      const user: P | null = await this.repository.findOne({ login: data.login });

      if (user !== null) {
        if (authenticate(data.password, user.salt, user.hashed_password)) {
          return jwt.sign({ id: user.id }, this.config.jwt.secret_key);
        }
      }
    }

    return Promise.reject(`[ INCORRECT_PROPS ][ login: ${data.login} ][ password: ${data.password} ]`);
  }

  public async updateLogin(data: { [key: string]: any }, uid: string, wsid: string): Promise<P | null> {
    if (isString(data.id) && isString(data.login)) {
      const result: object | null = await this.repository.findOne({ _id: new ObjectId(data.id) });

      if (result) {
        return super.update({ ...result, ...data }, uid, wsid);
      } else {
        return Promise.reject(`User with login: ${data.login}, isn't exist.`);
      }
    }

    return Promise.reject(`[ INCORRECT_PROPS ][ ID: ${data.id} ][ login: ${data.login} ]`);
  }

  public async updatePassword(data: { [key: string]: any }, uid: string, wsid: string): Promise<P | null> {
    if (isString(data.id) && isString(data.password) && isString(data.password_confirm)) {
      const isValidPassword = checkPassword(data.password, data.password_confirm);

      if (isValidPassword) {
        const result: object | null = await this.repository.findOne({ _id: new ObjectId(data.id) });

        if (result) {
          const salt = getSalt();
          const hashed_password = encryptPassword(data.password, salt);

          return super.update({ ...result, salt, hashed_password }, uid, wsid, { projection: { login: 1, group: 1 } });
        }

        return null;
      } else {
        return Promise.reject(isValidPassword);
      }
    }

    return Promise.reject(
      `[ INCORRECT_PROPS ][ ID: ${data.id} ][ password: ${data.password} ]` +
        `[ password_confirm: ${data.password_confirm} ]`,
    );
  }

  public async updateGroup(ids: string[], group: IUserGroup): Promise<P[]> {
    const query = { _id: { $in: ids.map((id) => new ObjectId(id)) } };

    await this.repository.updateMany(query, { $set: { group } });

    return super.read(query, { projection: { login: 1, group: 1 } });
  }
}

import { ObjectId } from "bson";
import * as jwt from "jsonwebtoken";
import { IAppConfig } from "../interfaces/IAppConfig";
import { IPersist } from "../interfaces/IPersist";
import { IRepository } from "../interfaces/IRepository";
import { IUserGroup } from "../interfaces/IUserGroup";
import { IUserModel } from "../interfaces/IUserModel";
import { authenticate } from "../utils/authenticate";
import { checkPassword } from "../utils/checkPassword";
import { encryptPassword } from "../utils/encryptPassword";
import { getSalt } from "../utils/getSalt";
import { userGroupEnum } from "./../enums/userGroupEnum";
import { IUser } from "./../interfaces/IUser";
import { Model } from "./Model";

export class UserModel<P extends IUser<G> & IPersist, I extends IUser<G>, G extends IUserGroup> extends Model<P, I>
  implements IUserModel<P, I, G> {
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

  public async init() {
    const result: any | null = await this.repository.findOne({});

    if (result === null) {
      await this.signUp("admin@admin.com", userGroupEnum.admin, "admin", "admin");
    }
  }

  public async signUp(login: string, groug: string, password: string, password_confirm: string): Promise<string> {
    const existingUser: any | null = await this.repository.findOne({ login });

    if (existingUser === null) {
      const isValidPassword = checkPassword(password, password_confirm);

      if (isValidPassword) {
        const salt = getSalt();
        const hashed_password = encryptPassword(password, salt);
        const insert = new this.Insert({
          groug,
          hashed_password,
          login,
          salt,
        });
        const user: P = await this.repository.insertOne(insert.toJS());

        return jwt.sign({ _id: user.id }, this.config.jwt.secret_key);
      }

      return Promise.reject(isValidPassword);
    } else {
      throw new Error(`Пользователь с таким: ${login} login уже зарегистрирован.`);
    }
  }

  public async signIn(login: string, password: string): Promise<string | null> {
    const user: P | null = await this.repository.findOne({ login });

    if (user !== null) {
      if (authenticate(password, user.salt, user.hashed_password)) {
        return jwt.sign({ id: user.id }, this.config.jwt.secret_key);
      }
    }

    return null;
  }

  public async read() {
    return await super.read({}, { projection: { login: 1, group: 1 } });
  }

  public async updateLogin(id: string, login: string, uid: string, wsid: string): Promise<P | null> {
    const result: object | null = await this.repository.findOne({ _id: new ObjectId(id) });

    if (result) {
      return super.update({ ...result, login }, uid, wsid, { projection: { login: 1, group: 1 } });
    } else {
      return Promise.reject(`User with login: ${login}, isn't exist.`);
    }
  }

  public async updatePassword(
    id: string,
    password: string,
    passwordConfirm: string,
    uid: string,
    wsid: string,
  ): Promise<P | null> {
    const isValidPassword = checkPassword(password, passwordConfirm);

    if (isValidPassword) {
      const result: object | null = await this.repository.findOne({ _id: new ObjectId(id) });

      if (result) {
        const salt = getSalt();
        const hashedPassword = encryptPassword(password, salt);

        return super.update({ ...result, salt, hashedPassword }, uid, wsid, { projection: { login: 1, group: 1 } });
      }

      return null;
    }

    return Promise.reject(isValidPassword);
  }

  public async updateGroup(ids: string[], group: IUserGroup): Promise<P[]> {
    const query = { _id: { $in: ids.map((id) => new ObjectId(id)) } };

    await this.repository.updateMany(query, { $set: { group } });

    return super.read(query, { projection: { login: 1, group: 1 } });
  }
}

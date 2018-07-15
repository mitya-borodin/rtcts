import { IPersist } from "../../interfaces/IPersist";
import { IUser } from "../../interfaces/IUser";
import { IService } from "./IService";

export interface IUserService<U extends IUser & IPersist> extends IService<U> {
  signIn(data: { [key: string]: any }): Promise<string | void>;

  signUp(data: object): Promise<{ token: string; user: object } | void>;

  current(): Promise<U | void>;

  updateLogin(data: { [key: string]: any }): Promise<U | void>;

  updatePassword(data: { [key: string]: any }): Promise<U | void>;

  updateGroup(ids: string[], group: string): Promise<U[] | void>;
}

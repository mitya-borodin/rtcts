import { IPersist } from "../../interfaces/IPersist";
import { IUser } from "../../interfaces/IUser";
import { IUserGroup } from "../../interfaces/IUserGroup";
import { IService } from "./IService";

export interface IUserService<U extends IUser<G> & IPersist, G extends IUserGroup> extends IService<U> {
  signIn(login: string, password: string): Promise<string | void>;

  signUp(data: object): Promise<string | void>;

  load(token: string): Promise<U | void>;

  updateLogin(id: string, login: string): Promise<U | void>;

  updatePassword(id: string, password: string, password_confirm: string): Promise<U | void>;

  updateGroup(ids: string[], group: G): Promise<U[] | void>;
}

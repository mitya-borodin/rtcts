import { IClientService } from "./IClientService";
import { IPersist } from "./IPersist";
import { IUser } from "./IUser";
import { IUserGroup } from "./IUserGroup";

export interface IClientUserService<U extends IUser<G> & IPersist, G extends IUserGroup> extends IClientService<U> {
  signIn(login: string, password: string): Promise<string | void>;

  signUp(login: string, password: string, password_confirm: string, group: G): Promise<string | void>;

  load(token: string): Promise<U | void>;

  updateLogin(id: string, login: string): Promise<U | void>;

  updatePassword(id: string, password: string, password_confirm: string): Promise<U | void>;

  updateGroup(ids: string[], group: G): Promise<U[] | void>;
}

import { IEventEmitter } from "./IEventEmitter";
import { IPersist } from "./IPersist";
import { IUser } from "./IUser";
import { IUserGroup } from "./IUserGroup";

export interface IUserStore<U extends IUser<G>, G extends IUserGroup> extends IEventEmitter {
  loading: boolean;
  user: U & IPersist | null;
  userList: Array<U & IPersist>;
  id: string;
  isToken: boolean;
  isUserData: boolean;
  isAdmin: boolean;
  isAuthorized: boolean;
  authorization: boolean;

  load(token: string): Promise<void>;

  login(login: string, password: string): Promise<string>;

  registration(login: string, password: string, password_confirm: string, group: string): Promise<string | void>;

  logout(): Promise<void>;

  loadUserList(): Promise<void>;

  updateLogin(id: string, login: string): Promise<void>;

  updatePassword(id: string, password: string, password_confirm: string): Promise<void>;

  updateGroup(ids: string[], updateGroup: G): Promise<void>;

  remove(id: string): Promise<void>;
}

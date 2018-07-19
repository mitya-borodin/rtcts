import { IPersist } from "../../interfaces/IPersist";
import { IUser } from "../../interfaces/IUser";
import { IRepository } from "./IRepository";

export interface IUserRepository<U extends IUser & IPersist> extends IRepository<U> {
  isToken: boolean;
  id: string;
  user: U | void;
  isAuthorized: boolean;
  isAdmin: boolean;

  signIn(data: { [key: string]: any }): Promise<void>;

  signOut(): Promise<void>;

  signUp(data: { [key: string]: any }): Promise<boolean>;

  updateLogin(data: { [key: string]: any }): Promise<void>;

  updatePassword(data: { [key: string]: any }): Promise<void>;

  updateGroup(ids: string[], group: string): Promise<void>;

  remove(id: string): Promise<void>;
}

import { IEntity, IUser } from "@borodindmitriy/interfaces";
import { IRepository } from "../repository/IRepository";

export interface IUserRepository<U extends IEntity & IUser> extends IRepository<U> {
  // ! ENTITY
  user: U | void;

  // ! COMPUTED
  id: string;
  isToken: boolean;
  isAuthorized: boolean;
  isAdmin: boolean;

  // ! ENTRY GROUP
  signIn(data: { [key: string]: any }): Promise<void>;
  signOut(): Promise<void>;
  signUp(data: { [key: string]: any }): Promise<boolean>;

  // ! UPDATE USER
  updateLogin(data: { [key: string]: any }): Promise<void>;
  updatePassword(data: { [key: string]: any }): Promise<void>;
  updateGroup(ids: string[], group: string): Promise<void>;

  // ! REMOVE USER
  remove(id: string): Promise<void>;
}

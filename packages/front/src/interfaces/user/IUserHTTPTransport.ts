import { IEntity, IUser } from "@borodindmitriy/interfaces";
import { IRepositoryHTTPTransport } from "../transport/http/IRepositoryHTTPTransport";

export interface IUserHTTPTransport<E extends IUser & IEntity> extends IRepositoryHTTPTransport<E> {
  ACL: {
    // ! CRUD
    collection: string[];
    current: string[];
    read: string[];
    create: string[];
    update: string[];
    remove: string[];

    // ! WS
    onChannel: string[];
    offChannel: string[];

    // ! ACTIONS
    updateLogin: string[];
    updatePassword: string[];
    updateGroup: string[];
  };

  current(): Promise<E | void>;

  // ! ENTRY GROUP
  signIn(data: { [key: string]: any }): Promise<string | void>;
  signUp(data: object): Promise<{ token: string; user: object } | void>;

  // ! UPDATE USER
  updateLogin(data: { [key: string]: any }): Promise<E | void>;
  updatePassword(data: { [key: string]: any }): Promise<E | void>;
  updateGroup(ids: string[], group: string): Promise<E[] | void>;
}

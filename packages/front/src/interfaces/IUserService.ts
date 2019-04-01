import { IEntity, IUser } from "@borodindmitriy/interfaces";
import { IRepositoryHTTPTransport } from "./infrastructure/transport/http/IRepositoryHTTPTransport";

export interface IUserService<U extends IUser & IEntity> extends IRepositoryHTTPTransport<U> {
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

  signIn(data: { [key: string]: any }): Promise<string | void>;

  signUp(data: object): Promise<{ token: string; user: object } | void>;

  current(): Promise<U | void>;

  updateLogin(data: { [key: string]: any }): Promise<U | void>;

  updatePassword(data: { [key: string]: any }): Promise<U | void>;

  updateGroup(ids: string[], group: string): Promise<U[] | void>;
}

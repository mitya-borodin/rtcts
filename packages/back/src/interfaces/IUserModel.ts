import { IPersist } from "@borodindmitriy/interfaces";
import { IModel } from "./IModel";

export interface IUserModel<P extends IPersist> extends IModel<P> {
  readAll(): Promise<P[]>;

  signUp(data: { [key: string]: any }): Promise<{ token: string; user: object }>;

  signIn(data: { [key: string]: any }): Promise<string | null>;

  updateLogin(data: { [key: string]: any }, uid: string, wsid: string): Promise<P | null>;

  updatePassword(data: { [key: string]: any }, uid: string, wsid: string): Promise<P | null>;

  updateGroup(ids: string[], group: string, uid: string, wsid: string): Promise<P[]>;
}

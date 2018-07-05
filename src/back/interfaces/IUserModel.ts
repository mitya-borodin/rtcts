import { IInsert } from "interfaces/IInsert";
import { IPersist } from "../../interfaces/IPersist";
import { IUserGroup } from "../../interfaces/IUserGroup";
import { IModel } from "./IModel";

export interface IUserModel<P extends IPersist, I extends IInsert, G extends IUserGroup> extends IModel<P, I> {
  signUp(login: string, group: G, password: string, password_confirm: string): Promise<string>;

  signIn(login: string, password: string): Promise<string | null>;

  updateLogin(id: string, login: string, uid: string, wsid: string): Promise<P | null>;

  updatePassword(id: string, password: string, passwordConfirm: string, uid: string, wsid: string): Promise<P | null>;

  updateGroup(ids: string[], group: G): Promise<P[]>;
}

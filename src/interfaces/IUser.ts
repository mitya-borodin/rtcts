import { IUserGroup } from "../interfaces/IUserGroup";
import { IInsert } from "./IInsert";

export interface IUser<G extends IUserGroup> extends IInsert {
  login: string;
  salt: string;
  hashed_password: string;
  group: G;
}

import { IInsert } from "./IInsert";
import { IUserGroup } from "./IUserGroup";

export interface IUser<G extends IUserGroup> extends IInsert {
  login: string;
  salt: string;
  hashed_password: string;
  group: G;
}

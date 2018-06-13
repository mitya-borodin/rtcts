import { IInsert } from "../IInsert";

export interface IUser extends IInsert {
  login: string;
  salt: string;
  hashed_password: string;
}

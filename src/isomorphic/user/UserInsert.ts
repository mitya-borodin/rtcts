import { IUser } from "../../interfaces/IUser";
import { isString } from "../../utils/isType";

export class UserInsert implements IUser {
  public readonly login: string;
  public readonly group: string;
  public readonly salt: string;
  public hashed_password: string;

  constructor(data?: any) {
    this.login = "";
    this.group = "";
    this.salt = "";
    this.hashed_password = "";

    if (data) {
      if (data.login && isString(data.login)) {
        this.login = data.login;
      } else {
        throw new Error(`[${this.constructor.name}][ login ], must be a string;`);
      }

      if (isString(data.group)) {
        this.group = data.group;
      }

      if (isString(data.salt)) {
        this.salt = data.salt;
      }

      if (isString(data.hashed_password)) {
        this.hashed_password = data.hashed_password;
      }
    }
  }

  public toJS(): { [key: string]: any } {
    return {
      group: this.group,
      hashed_password: this.hashed_password,
      login: this.login,
      salt: this.salt,
    };
  }
}

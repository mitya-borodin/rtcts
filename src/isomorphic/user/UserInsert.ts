import { IUser } from "interfaces/IUser";
import { IUserGroup } from "interfaces/IUserGroup";
import { isString } from "utils/isType";

export class UserInsert<G extends IUserGroup> implements IUser<G> {
  public readonly login: string;
  public readonly salt: string;
  public readonly group: G;
  public hashed_password: string;

  constructor(data?: any) {
    this.login = "";
    this.salt = "";
    this.hashed_password = "";
    this.group = "" as G;

    if (data) {
      if (data.login && isString(data.login)) {
        this.login = data.login;
      } else {
        throw new Error(`[${this.constructor.name}][ login ], must be a string;`);
      }

      if (data.salt && isString(data.salt)) {
        this.salt = data.salt;
      }

      if (data.hashed_password && isString(data.hashed_password)) {
        this.salt = data.salt;
      }

      if (isString(data.group)) {
        this.group = data.group;
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

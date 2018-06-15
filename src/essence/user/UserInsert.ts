import { IUser } from "../../interfaces/essence/IUser";
import { isString } from "../../utils/isType";

export class UserInsert implements IUser {
  public readonly login: string;
  public readonly salt: string;
  public hashed_password: string;

  constructor(data?: any) {
    this.login = "";
    this.salt = "";
    this.hashed_password = "";

    if (data) {
      if (data.login && isString(data.login)) {
        this.login = data.login;
      } else {
        throw new Error(
          `[${this.constructor.name}][ login ], must be a string;`,
        );
      }

      if (data.salt && isString(data.salt)) {
        this.salt = data.salt;
      }

      if (data.hashed_password && isString(data.hashed_password)) {
        this.salt = data.salt;
      }
    }
  }

  public toJS(): { [key: string]: any } {
    return {
      hashed_password: this.hashed_password,
      login: this.login,
      salt: this.salt,
    };
  }
}

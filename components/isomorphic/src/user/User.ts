import { isString } from "@borodindmitriy/utils";

type Mandatory = "login" | "group";
type Optional = "id" | "salt" | "hashedPassword";
type Data = Required<Pick<User, Mandatory>> & Pick<User, Optional>;

const fields: string[] = ["id", "login", "group", "salt", "hashedPassword"];

export class User {
  public static isEntity = (data: Data, insert = false): data is Required<Data> => {
    for (const field of fields) {
      if (insert && field === "id") {
        continue;
      }

      if (!isString(data[field])) {
        throw new Error(`User.${field} should be String`);
      }
    }

    return true;
  };

  public readonly id?: string;
  public readonly login: string;
  public readonly group: string;
  public readonly salt?: string;
  public readonly hashedPassword?: string;

  constructor(data: Data) {
    if (data) {
      for (const field of fields) {
        if (isString(data[name])) {
          this[field] = data[field];
        }
      }
    } else {
      throw new Error(`User(data) data should be defined`);
    }
  }

  public toObject(): Data {
    return {
      ...(this.id ? { id: this.id } : {}),
      login: this.login,
      group: this.group,
      ...(this.salt ? { salt: this.salt } : {}),
      ...(this.hashedPassword ? { hashedPassword: this.hashedPassword } : {}),
    };
  }

  public toJSON(): Data {
    return this.toObject();
  }
}

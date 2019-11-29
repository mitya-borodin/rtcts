import { isString } from "@borodindmitriy/utils";
import { Entity } from "../Entity";

type Mandatory = "login" | "group";
type Optional = "id" | "salt" | "hashedPassword";
export type UserData = Required<Pick<User, Mandatory>> & Pick<User, Optional>;

const fields: string[] = ["id", "login", "group", "salt", "hashedPassword"];

export class User implements Entity<UserData> {
  public readonly id?: string;
  public readonly login: string;
  public readonly group: string;
  public readonly salt?: string;
  public readonly hashedPassword?: string;

  constructor(data: UserData) {
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

  public isEntity(insert = false): this is Required<UserData> {
    for (const field of fields) {
      if (insert && field === "id") {
        continue;
      }

      if (!isString(this[field])) {
        throw new Error(`User.${field} should be String`);
      }
    }

    return true;
  }

  public toObject(): UserData {
    return {
      ...(this.id ? { id: this.id } : {}),
      login: this.login,
      group: this.group,
      ...(this.salt ? { salt: this.salt } : {}),
      ...(this.hashedPassword ? { hashedPassword: this.hashedPassword } : {}),
    };
  }

  public toJSON(): UserData {
    return this.toObject();
  }
}

/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { isString } from "@rtcts/utils";
import { Entity, EntityID } from "../Entity";
import { ValidateResult } from "../validate/ValidateResult";
import { Validate } from "../validate/Validate";
import { logTypeEnum } from "../log/logTypeEnum";

export type UserData = Pick<User, "login" | "group" | "salt" | "hashedPassword">;

const fields: string[] = ["login", "group", "salt", "hashedPassword"];

export class User<VA extends any[] = any[]> extends Entity<UserData, VA> {
  public readonly login?: string;
  public readonly group?: string;
  public readonly salt?: string;
  public readonly hashedPassword?: string;

  // The check in the constructor ensures that the correct fields will be written into the object
  constructor(data: UserData & EntityID) {
    super(data);

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

  // The canBeInsert method ensures that all mandatory fields are filled in and have the correct data type.
  public canBeInsert(): this is Required<UserData> {
    for (const field of fields) {
      if (!isString(this[field])) {
        throw new Error(`User.${field} should be String`);
      }
    }

    return true;
  }

  public checkNoSecure(): this is Required<Omit<UserData, "salt" | "hashedPassword">> {
    for (const field of ["login", "group"]) {
      if (!isString(this[field])) {
        throw new Error(`User.${field} should be String`);
      }
    }

    return true;
  }

  // The validate method allows you to implement the logic of checking the entered values in the object and to minimize the object describing the result of the check
  public async validate(...args: VA): Promise<ValidateResult> {
    const validates: Validate[] = [];

    if (!isString(this.login)) {
      validates.push(
        new Validate({
          field: "login",
          message: `Login should be typed`,
          type: logTypeEnum.error,
        }),
      );
    }

    if (!isString(this.group)) {
      validates.push(
        new Validate({
          field: "group",
          message: `Group should be selected`,
          type: logTypeEnum.error,
        }),
      );
    }

    return new ValidateResult(validates);
  }

  // The eject method returns an object with fields that are the object's content
  protected eject(): UserData {
    return {
      login: this.login,
      group: this.group,
      ...(this.salt ? { salt: this.salt } : {}),
      ...(this.hashedPassword ? { hashedPassword: this.hashedPassword } : {}),
    };
  }
}

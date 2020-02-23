/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-unused-vars */
import { isString } from "@rtcts/utils";
import { Entity, EntityID } from "../Entity";
import { ValidateResult } from "../validate/ValidateResult";
import { Validate } from "../validate/Validate";
import { logTypeEnum } from "../log/logTypeEnum";
import omit from "lodash.omit";

export interface UserData {
  readonly login?: string;
  readonly group?: string;
  readonly salt?: string;
  readonly hashedPassword?: string;
}

const noSecureFields: string[] = ["login", "group"];
const secureFields: string[] = ["salt", "hashedPassword"];

export class User<DATA extends UserData = UserData, VA extends object = object> extends Entity<
  DATA,
  VA
> {
  public readonly login?: string;
  public readonly group?: string;
  public readonly salt?: string;
  public readonly hashedPassword?: string;

  // The check in the constructor ensures that the correct noSecureFields will be written into the object
  constructor(data: Partial<EntityID> & Partial<DATA>) {
    super(data);

    if (data) {
      for (const field of [...noSecureFields, ...secureFields]) {
        if (isString(data[field])) {
          this[field] = data[field];
        }
      }
    } else {
      throw new Error(`User(data) data should be defined`);
    }
  }

  // The canBeInsert method ensures that all mandatory noSecureFields are filled in and have the correct data type.
  public canBeInsert<T = DATA>(): this is Required<T> {
    for (const field of [...noSecureFields, ...secureFields]) {
      if (!isString(this[field])) {
        throw new Error(`User.${field} should be String`);
      }
    }

    return true;
  }

  public isEntityWithNoSecureFields<T = DATA>(): this is Required<EntityID> & Required<T> {
    if (!isString(this.id)) {
      throw new Error(`${this.constructor.name}.id should be String`);
    }

    this.checkNoSecureFields();

    return true;
  }

  public checkNoSecureFields(): this is Pick<Required<UserData>, "login" | "group"> {
    for (const field of noSecureFields) {
      if (!isString(this[field])) {
        throw new Error(`User.${field} should be String`);
      }
    }

    return true;
  }

  public checkSecureFields(): this is Pick<Required<UserData>, "salt" | "hashedPassword"> {
    for (const field of secureFields) {
      if (!isString(this[field])) {
        throw new Error(`User.${field} should be String`);
      }
    }

    return true;
  }

  // The validate method allows you to implement the logic of checking the entered values in the object and to minimize the object describing the result of the check
  public validate(...args: any[]): ValidateResult {
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

  public getUnSecureData(): Omit<DATA, "salt" | "hashedPassword"> {
    return omit(this.toObject(), ["salt", "hashedPassword"]);
  }

  // ! The eject method returns an object as DATA with allFields that are the current object's content
  protected eject(): DATA {
    return {
      login: this.login,
      group: this.group,
      ...(this.salt ? { salt: this.salt } : {}),
      ...(this.hashedPassword ? { hashedPassword: this.hashedPassword } : {}),
    } as DATA;
  }
}

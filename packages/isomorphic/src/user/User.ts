/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-unused-vars */
import { isString } from "@rtcts/utils";
import omit from "lodash.omit";
import { Entity } from "../Entity";
import { logTypeEnum } from "../log/logTypeEnum";
import { Validation } from "../validation/Validation";
import { ValidationResult } from "../validation/ValidationResult";

export interface UserData {
  readonly id?: string;
  readonly login?: string;
  readonly group?: string;
  readonly salt?: string;
  readonly hashedPassword?: string;
}

const noSecureFields: string[] = ["login", "group"];
const secureFields: string[] = ["salt", "hashedPassword"];

export class User implements Entity {
  readonly id?: string;
  readonly login?: string;
  readonly group?: string;
  readonly salt?: string;
  readonly hashedPassword?: string;

  // The check in the constructor ensures that the correct noSecureFields will be written into the object
  constructor(data: Partial<UserData>) {
    if (!data) {
      throw new Error(`User(data) data should be defined`);
    }

    if (isString(data.id)) {
      this.id = data.id;
    }

    for (const field of [...noSecureFields, ...secureFields]) {
      if (isString(data[field])) {
        this[field] = data[field];
      }
    }
  }

  isEntity(): this is Required<Omit<UserData, "salt" | "hashedPassword">> {
    if (!isString(this.id)) {
      throw new Error(`${this.constructor.name}.id should be String`);
    }

    this.isInsert();

    return true;
  }

  // The canBeInsert method ensures that all mandatory noSecureFields are filled in and have the correct data type.
  isInsert(): this is Required<Omit<UserData, "id" | "salt" | "hashedPassword">> {
    this.checkNoSecureFields();

    return true;
  }

  isSecureEntity(): this is Required<UserData> {
    if (!isString(this.id)) {
      throw new Error(`${this.constructor.name}.id should be String`);
    }

    this.isSecureInsert();

    return true;
  }

  isSecureInsert(): this is Required<Omit<UserData, "id">> {
    this.checkNoSecureFields();
    this.checkSecureFields();

    return true;
  }

  hasId(): this is { id: string } {
    return isString(this.id);
  }

  checkNoSecureFields(): this is Pick<Required<UserData>, "login" | "group"> {
    for (const field of noSecureFields) {
      if (!isString(this[field])) {
        throw new Error(`User.${field} should be String`);
      }
    }

    return true;
  }

  checkSecureFields(): this is Pick<Required<UserData>, "salt" | "hashedPassword"> {
    for (const field of secureFields) {
      if (!isString(this[field])) {
        throw new Error(`User.${field} should be String`);
      }
    }

    return true;
  }

  // The Validation method allows you to implement the logic of checking the entered values in the object and to minimize the object describing the result of the check
  validation(): ValidationResult {
    const validations: Validation[] = [];

    if (!isString(this.login)) {
      validations.push(
        new Validation({
          field: "login",
          message: `Login should be typed`,
          type: logTypeEnum.error,
        }),
      );
    }

    if (!isString(this.group)) {
      validations.push(
        new Validation({
          field: "group",
          message: `Group should be selected`,
          type: logTypeEnum.error,
        }),
      );
    }

    return new ValidationResult(validations);
  }

  getUnSecureData(): Omit<UserData, "salt" | "hashedPassword"> {
    return omit(this.toObject(), ["salt", "hashedPassword"]);
  }

  toObject(): UserData {
    return {
      ...(isString(this.id) ? { id: this.id } : {}),
      login: this.login,
      group: this.group,
      ...(this.salt ? { salt: this.salt } : {}),
      ...(this.hashedPassword ? { hashedPassword: this.hashedPassword } : {}),
    };
  }

  toJSON(): UserData {
    return this.toObject();
  }

  toJS(): UserData {
    return this.toObject();
  }
}

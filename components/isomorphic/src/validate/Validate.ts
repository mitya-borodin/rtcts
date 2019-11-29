import { isArray, isString, isUndefined } from "@borodindmitriy/utils";
import { ValueObject } from "../Entity";
import { Log } from "../log/Log";

export class Validate extends Log implements ValueObject<any> {
  public readonly field: string | string[];
  public readonly title?: string;

  constructor(data?: any) {
    super(data);

    this.field = "";

    if (data) {
      if (isString(data.field)) {
        this.field = data.field;
      }

      if (isArray(data.field)) {
        this.field = [];

        for (const field of data.field) {
          if (isString(field)) {
            this.field.push(field);
          } else {
            throw new Error(`[ ${this.constructor.name} ][ field ][ MUST_BE_A_STRING ]`);
          }
        }
      }

      if (isUndefined(this.field)) {
        throw new Error(
          `[ ${this.constructor.name} ][ field ][ MUST_BE_A_STRING OR ARRAY OF STRING ]`,
        );
      }

      if (!isUndefined(data.title)) {
        if (isString(data.title)) {
          this.title = data.title;
        } else {
          throw new Error(`[ ${this.constructor.name} ][ title ][ MUST_BE_A_STRING ]`);
        }
      }
    }

    Object.freeze(this);
  }

  public get log(): Log {
    return new Log({ type: this.type, message: this.message });
  }

  public toObject(): any {
    return {
      ...super.toObject(),
      field: this.field,
      title: this.title,
    };
  }
}

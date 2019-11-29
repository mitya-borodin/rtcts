import { ILog } from "@borodindmitriy/interfaces";
import { isArray, isString, isUndefined } from "@borodindmitriy/utils";
import { Log } from "./log/Log";
import { ValueObject } from "./Entity";

// tslint:disable-next-line:max-classes-per-file
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

  public get log(): ILog {
    return new Log({ type: this.type, message: this.message });
  }

  public toJS(): { [key: string]: any } {
    return {
      ...super.toJS(),
      field: this.field,
      title: this.title,
    };
  }
}

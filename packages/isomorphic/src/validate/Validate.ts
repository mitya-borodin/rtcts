import { isArray, isString, isUndefined } from "@rtcts/utils";
import { Log, LogData } from "../log/Log";

export interface ValidateData extends LogData {
  readonly field: string | string[];
  readonly title?: string;
}

export class Validate<DATA extends ValidateData = ValidateData> extends Log<DATA> {
  public readonly field: string | string[];
  public readonly title?: string;

  constructor(data: Partial<DATA>) {
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

  public get log(): Log<LogData> {
    return new Log({ type: this.type, message: this.message });
  }

  public toObject(): DATA {
    return {
      ...super.toObject(),
      field: this.field,
      title: this.title,
    } as DATA;
  }
}

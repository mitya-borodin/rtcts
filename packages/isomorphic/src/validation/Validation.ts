import { isArray, isString, isUndefined } from "@rtcts/utils";
import { EssentialObject } from "../Entity";
import { Log, LogData } from "../log/Log";

export interface ValidationData extends LogData {
  readonly field: string | string[];
  readonly title?: string;
}

export class Validation extends Log implements EssentialObject {
  readonly field: string | string[];
  readonly title?: string;

  constructor(data: Partial<ValidationData>) {
    super(data);

    this.field = "";

    if (isString(data.field)) {
      this.field = data.field;
    }

    if (isArray(data.field)) {
      const fields: string[] = [];

      data.field.forEach((field, index) => {
        if (isString(field)) {
          fields.push(field);
        } else {
          throw new Error(`${this.constructor.name}.field[${index}] should be string`);
        }
      });

      this.field = fields;
    }

    if (isUndefined(this.field)) {
      throw new Error(`${this.constructor.name}.field should be string or array of string`);
    }

    if (!isUndefined(data.title)) {
      if (isString(data.title)) {
        this.title = data.title;
      } else {
        throw new Error(`${this.constructor.name}.title should be string`);
      }
    }

    Object.freeze(this);
  }

  get log(): Log {
    return new Log({ type: this.type, message: this.message });
  }

  toObject(): ValidationData {
    return {
      ...super.toObject(),
      field: this.field,
      title: this.title,
    };
  }

  toJSON(): ValidationData {
    return this.toObject();
  }

  toJS(): ValidationData {
    return this.toObject();
  }
}

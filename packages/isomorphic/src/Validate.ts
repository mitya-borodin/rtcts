import { Log } from "./Log";
import { ILog, ILogType, IValidate } from "@borodindmitriy/interfaces";
import { isString, isUndefined } from "@borodindmitriy/utils";

// tslint:disable-next-line:max-classes-per-file
export class Validate extends Log implements IValidate {
  public readonly field: string;
  public readonly title?: string;

  constructor(data?: { field?: string; title?: string; type?: ILogType; message?: string }) {
    super(data);

    if (data) {
      if (isString(data.field)) {
        this.field = data.field;
      } else {
        throw new Error(`[ ${this.constructor.name} ][ field ][ MUST_BE_A_STRING ]`);
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

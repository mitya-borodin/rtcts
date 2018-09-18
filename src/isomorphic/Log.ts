import { ILog } from "../interfaces/ILog";
import { ILogType } from "../interfaces/ILogType";
import { isString } from "../utils/isType";

export class Log implements ILog {
  public readonly type: ILogType;
  public readonly message: string;

  constructor(data?: { type?: ILogType; message?: string }) {
    if (data) {
      if (isString(data.type)) {
        this.type = data.type;
      } else {
        throw new Error(`[ ${this.constructor.name} ][ type ][ MUST_BE_A_STRING ]`);
      }

      if (isString(data.message)) {
        this.message = data.message;
      } else {
        throw new Error(`[ ${this.constructor.name} ][ message ][ MUST_BE_A_STRING ]`);
      }
    }

    Object.freeze(this);
  }

  public toJS(): { [key: string]: any } {
    return {
      message: this.message,
      type: this.type,
    };
  }
}

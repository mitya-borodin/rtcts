import { ILog, ILogType, logTypeEnum } from "@borodindmitriy/interfaces";
import { isString } from "@borodindmitriy/utils";

export class Log implements ILog {
  public readonly type: ILogType;
  public readonly message: string;

  constructor(data?: { type?: ILogType; message?: string }) {
    this.type = logTypeEnum.log;
    this.message = "";

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
  }

  public toJS(): { [key: string]: any } {
    return {
      message: this.message,
      type: this.type,
    };
  }
}
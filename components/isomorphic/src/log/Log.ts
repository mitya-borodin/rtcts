import { isString } from "@borodindmitriy/utils";
import { logTypeEnum } from "./logTypeEnum";
import { LogType } from "./LogType";

type Mandatory = "type" | "message";
type Data = Required<Pick<Log, Mandatory>>;

const fields: string[] = ["type", "message"];

export class Log {
  public readonly type: LogType;
  public readonly message: string;

  constructor(data: Data) {
    this.type = logTypeEnum.log;
    this.message = "";

    if (data) {
      for (const field of fields) {
        if (isString(data[name])) {
          this[field] = data[field];
        } else {
          throw new Error(`Log.${field} should be String`);
        }
      }
    } else {
      throw new Error(`Log(data) data should be defined`);
    }
  }

  public toObject(): Data {
    return {
      type: this.type,
      message: this.message,
    };
  }

  public toJSON(): Data {
    return this.toObject();
  }
}

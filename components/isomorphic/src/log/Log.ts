import { isString } from "@borodindmitriy/utils";
import { ValueObject } from "../Entity";
import { LogType } from "./LogType";
import { logTypeEnum } from "./logTypeEnum";

type Mandatory = "type" | "message";
export type LogData = Required<Pick<Log, Mandatory>>;

const fields: string[] = ["type", "message"];

export class Log implements ValueObject<LogData> {
  public readonly type: LogType;
  public readonly message: string;

  constructor(data: LogData) {
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

  public toObject(): LogData {
    return {
      type: this.type,
      message: this.message,
    };
  }

  public toJSON(): LogData {
    return this.toObject();
  }
}

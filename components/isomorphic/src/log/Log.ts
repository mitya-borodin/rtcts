import { isString } from "@borodindmitriy/utils";
import { LogType } from "./LogType";
import { logTypeEnum } from "./logTypeEnum";
import { ValueObject } from "../Entity";

export type LogData = Required<Pick<Log, "type" | "message">>;

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

  public toJSON(): object {
    return this.toObject();
  }
}

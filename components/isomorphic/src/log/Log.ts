import { isString } from "@framework/utils";
import { SimpleObject } from "../Entity";
import { LogType } from "./LogType";
import { logTypeEnum } from "./logTypeEnum";

export type LogData = Pick<Log, "type" | "message">;

const fields: string[] = ["type", "message"];

export class Log extends SimpleObject<LogData> {
  public readonly type: LogType;
  public readonly message: string;

  constructor(data: LogData) {
    super();

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
}

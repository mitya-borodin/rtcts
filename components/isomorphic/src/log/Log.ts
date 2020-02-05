import { isString } from "@rtcts/utils";
import { SimpleObject } from "../Entity";
import { LogType } from "./LogType";
import { logTypeEnum } from "./logTypeEnum";

export interface LogData {
  readonly type: LogType;
  readonly message: string;
}

const fields: string[] = ["type", "message"];

export class Log<DATA extends LogData = LogData> extends SimpleObject<DATA> {
  public readonly type: LogType;
  public readonly message: string;

  constructor(data: Partial<DATA>) {
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

  public toObject(): DATA {
    return {
      type: this.type,
      message: this.message,
    } as DATA;
  }
}

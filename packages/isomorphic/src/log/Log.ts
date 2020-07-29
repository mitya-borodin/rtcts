/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { isString } from "@rtcts/utils";
import { EssentialObject } from "../Entity";
import { LogType } from "./LogType";
import { logTypeEnum } from "./logTypeEnum";

export interface LogData {
  readonly type: LogType;
  readonly message: string;
}

export class Log implements EssentialObject {
  readonly type: LogType;
  readonly message: string;

  constructor(data: Partial<LogData>) {
    this.type = logTypeEnum.log;
    this.message = "";

    if (!data) {
      throw new Error(`Log(data) data should be defined`);
    }

    if (isString(data.type)) {
      this.type = data.type;
    } else {
      throw new Error(`Log.type should be string`);
    }

    if (isString(data.message)) {
      this.message = data.message;
    } else {
      throw new Error(`Log.message should be string`);
    }
  }

  toObject(): LogData {
    return {
      type: this.type,
      message: this.message,
    };
  }

  toJSON(): LogData {
    return this.toObject();
  }

  toJS(): LogData {
    return this.toObject();
  }
}

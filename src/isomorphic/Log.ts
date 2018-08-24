import { ILog } from "../interfaces/ILog";
import { ILogType } from "../interfaces/ILogType";

export class Log implements ILog {
  public readonly type: ILogType;
  public readonly message: string;

  constructor(data: ILog) {
    this.type = data.type;
    this.message = data.message;
  }
}

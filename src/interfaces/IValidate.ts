import { ILog } from "./ILog";

export interface IValidate extends ILog {
  field: string;
  title?: string;

  log: ILog;
}

import { ILog } from "./ILog";

export interface IValidate extends ILog {
  // DATA_SOURCE
  field: string;
  title?: string;

  // COMPUTED
  log: ILog;

  // ACTIONS
  toJS(): { [key: string]: any };
}

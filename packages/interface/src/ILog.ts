import { ILogType } from "../interface";

export interface ILog {
  // DATA_SOURCE
  type: ILogType;
  message: string;

  // ACTIONS
  toJS(): { [key: string]: any };
}

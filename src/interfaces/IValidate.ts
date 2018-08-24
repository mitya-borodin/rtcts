import { ILog } from "./ILog";

export interface IValidateResult<V extends IValidate = IValidate> {
  isValid: boolean;
  messages: string[];
  results: V[];
  log: ILog[];

  getFieldValidation(field: string): V | void;

  hasFieldError(field: string): boolean;
}

export interface IValidate extends ILog {
  field: string;
  title?: string;

  log: ILog;
}

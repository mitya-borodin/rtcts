import { ILog } from "./ILog";

export interface IValidateResult<V extends IValidate = IValidate> {
  isValid: boolean;
  messages: string[];
  results: V[];
  log: ILog[];

  getFieldValidation(field: string): V | void;
  getFieldMessage(a_field: string): string;
  hasFieldError(field: string): boolean;
}

export interface IValidate extends ILog {
  field: string;
  title?: string;

  log: ILog;
}

import { ILog } from "./ILog";
import { IValidate } from "./IValidate";

export interface IValidateResult<V extends IValidate = IValidate> {
  // DATA_SOURCE
  results: V[];

  // COMPUTED
  isValid: boolean;
  hasError: boolean;
  hasWarn: boolean;
  hasLog: boolean;
  hasInfo: boolean;
  messages: string[];
  log: ILog[];

  // ACTIONS
  getFieldValidation(field: string): V | void;
  getFieldTitle(a_field: string): string;
  getFieldMessage(a_field: string): string;
  getValidateStatus(a_field: string): any;
  hasFieldError(field: string): boolean;
  hasFieldWarning(field: string): boolean;
  hasFieldInfo(field: string): boolean;
  hasFieldLog(field: string): boolean;
  toValidate(): V[];
  toJS(): { [key: string]: any };
}
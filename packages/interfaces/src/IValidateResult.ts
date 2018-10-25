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
  getFieldMessage(a_field: string): string;
  hasFieldError(field: string): boolean;
  toValidate(): V[];
  toJS(): { [key: string]: any };
}

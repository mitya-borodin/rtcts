import { ILog } from "./ILog";
import { IValidate } from "./IValidate";

export interface IValidateResult<V extends IValidate = IValidate> {
  isValid: boolean;
  messages: string[];
  results: V[];
  log: ILog[];

  getFieldValidation(field: string): V | void;
  getFieldMessage(a_field: string): string;
  hasFieldError(field: string): boolean;
}

import { IInsert } from "./IInsert";
import { IValidateResult } from "./IValidate";

export interface IForm extends IInsert {
  id: string | void;

  validate(): IValidateResult;
}

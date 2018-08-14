import { IInsert } from "./IInsert";
import { IValidateResult } from "./IValidate";

export interface IForm<VR extends IValidateResult = IValidateResult> extends IInsert {
  id: string | void;

  validate(): VR;
}

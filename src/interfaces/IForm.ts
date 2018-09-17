import { IInsert } from "./IInsert";
import { IValidateResult } from "./IValidateResult";

export interface IForm<VR extends IValidateResult = IValidateResult> extends IInsert {
  id: string | void;

  validate(...args: any[]): VR;
}

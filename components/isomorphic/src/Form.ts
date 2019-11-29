import { ValidateResult } from "./ValidateResult";

export interface Form<VR extends ValidateResult = ValidateResult> {
  id: string | void;

  getValidateResult(...args: any[]): VR;
}

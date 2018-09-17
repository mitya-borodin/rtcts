import { ILog } from "../interfaces/ILog";
import { IValidate } from "../interfaces/IValidate";
import { IValidateResult } from "../interfaces/IValidateResult";
import { Validate } from "./Validate";

export class ValidateResult<V extends IValidate = IValidate> implements IValidateResult<V> {
  public readonly results: V[];

  constructor(results: V[]) {
    this.results = results;
  }

  get isValid(): boolean {
    return this.results.length === 0;
  }

  get messages(): string[] {
    return this.results.map(({ message }) => message);
  }

  get log(): ILog[] {
    return this.results.map((v) => v.log);
  }

  public getFieldValidation(a_field: string): V | void {
    return this.results.find(({ field }) => a_field === field);
  }

  public getFieldMessage(a_field: string): string {
    const v = this.getFieldValidation(a_field);

    if (v instanceof Validate) {
      return v.message;
    }

    return "";
  }

  public hasFieldError(a_field: string): boolean {
    return !!this.getFieldValidation(a_field);
  }
}

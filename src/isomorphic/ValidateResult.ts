import { IValidate, IValidateResult } from "../interfaces/IValidate";

export class ValidateResult implements IValidateResult {
  public readonly results: IValidate[];

  constructor(results: IValidate[]) {
    this.results = results;
  }

  get isValid(): boolean {
    return this.results.length === 0;
  }

  get messages(): string[] {
    return this.results.map(({ message }) => message);
  }

  public getFieldValidation(a_field: string): IValidate | void {
    return this.results.find(({ field }) => a_field === field);
  }

  public hasFieldError(a_field: string): boolean {
    return !!this.getFieldValidation(a_field);
  }
}

// tslint:disable-next-line:max-classes-per-file
export class Validate implements IValidate {
  public readonly field: string;
  public readonly message: string;
  public readonly type: "warning" | "error";

  constructor(data: IValidate) {
    this.field = data.field;
    this.message = data.message;
    this.type = data.type;
  }
}

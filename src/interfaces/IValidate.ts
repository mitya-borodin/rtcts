export interface IValidateResult {
  isValid: boolean;
  messages: string[];
  results: IValidate[];

  getFieldValidation(field: string): IValidate | void;

  hasFieldError(field: string): boolean;
}

export interface IValidate {
  field: string;
  message: string;
  type: "warning" | "error";
}

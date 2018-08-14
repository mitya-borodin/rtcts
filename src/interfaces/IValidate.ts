export interface IValidateResult<V extends IValidate = IValidate> {
  isValid: boolean;
  messages: string[];
  results: V[];

  getFieldValidation(field: string): V | void;

  hasFieldError(field: string): boolean;
}

export interface IValidate {
  field: string;
  message: string;
  type: "warning" | "error";
}

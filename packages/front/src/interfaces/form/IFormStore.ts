import { IValidateResult } from "@borodindmitriy/interfaces";

export interface IFormStore<F, C> {
  pending: boolean;

  // ! FORM
  form: F | void;
  isOpen: boolean;
  isEdit: boolean;

  // ! VALIDATE
  validate: IValidateResult;
  isValid: boolean;
  showValidationResult: boolean;

  // ! ACTIONS
  open(id?: string): Promise<void>;
  change(change: C): Promise<void>;
  cancel(): void;
  submit(): Promise<void>;
}

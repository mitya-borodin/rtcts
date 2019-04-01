import { IValidateResult } from "@borodindmitriy/interfaces";

export interface IFormStore<F, C> {
  pending: boolean;

  form: F | void;
  isOpen: boolean;
  isEdit: boolean;

  validate: IValidateResult;
  showValidationResult: boolean;

  open(id?: string): Promise<void>;
  change(change: C): Promise<void>;
  cancel(): void;
  submit(): Promise<void>;
}

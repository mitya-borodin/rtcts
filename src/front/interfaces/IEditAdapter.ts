import { IValidateResult } from "../../interfaces/IValidate";
import { IAdapter } from "./IAdapter";

export interface IEditAdapter<C> extends IAdapter {
  isOpen: boolean;
  isEdit: boolean;
  showAlerts: boolean;

  validate: IValidateResult;

  onDidMount(): Promise<void>;

  change(chage: C): void;
  save(): Promise<void>;
  remove(): Promise<void>;
  cancel(): void;
}

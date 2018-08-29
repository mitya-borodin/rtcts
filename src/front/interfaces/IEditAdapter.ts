import { IValidateResult } from "../../interfaces/IValidate";
import { IAdapter } from "./IAdapter";

export interface IEditAdapter<U, C> extends IAdapter {
  isEdit: boolean;
  showAlerts: boolean;

  UI: U | void;
  validate: IValidateResult;

  onDidMount(): Promise<void>;

  onChange(chage: C): void;

  save(): Promise<void>;
  remove(): Promise<void>;
  cancel(): void;
}

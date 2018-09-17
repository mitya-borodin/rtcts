import { IValidateResult } from "../../interfaces/IValidateResult";
import { IComposition } from "./IComposition";

export interface IEditComposition<CHANGE> extends IComposition {
  isOpen: boolean;
  isEdit: boolean;

  showAlerts: boolean;
  validate: IValidateResult;

  onDidMount(): Promise<void>;

  change(chage: CHANGE): void;
  save(): Promise<void>;
  remove(): Promise<void>;
  cancel(): void;
}

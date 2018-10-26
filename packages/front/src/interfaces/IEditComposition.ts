import { History } from "history";
import { IValidateResult } from "@borodindmitriy/interfaces";
import { IComposition } from "./IComposition";

export interface IEditCompositionAdapter extends IComposition {
  // FORM_FLAGS
  isOpen: boolean;
  isEdit: boolean;

  // SOURCE
  history: History;

  // VALIDATE
  showAlerts: boolean;
  validate: IValidateResult;
}

export interface IEditCompositionActions<CHANGE> {
  change(chage: CHANGE): void;
  save(): Promise<void>;
  remove(): Promise<void>;
  cancel(): void;

  // HOOKS
  onDidMount(): Promise<void>;
}

export interface IEditComposition<CHANGE> {
  adapter: IEditCompositionAdapter;
  actions: IEditCompositionActions<CHANGE>;
}

import { IForm } from "@borodindmitriy/interfaces";
import { IFormStore } from "./IFormStore";

export interface ICommonStoreForm<F extends IForm, C> extends IFormStore<F, C> {
  isLoading: boolean;

  setIsValid(isValid: boolean): void;
  startLoading(): void;
  endLoading(): void;
}

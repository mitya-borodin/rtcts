import { IComposition } from "./IComposition";

export interface IListCompositionAdapter<T> extends IComposition {
  // SOURCE
  history: History;
  list: T[];
}

export interface IListCompositionActions {
  // HOOKS
  onDidMount(): Promise<void>;
}

export interface IListComposition<T> {
  adapter: IListCompositionAdapter<T>;
  actions: IListCompositionActions;
}

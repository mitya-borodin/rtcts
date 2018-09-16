import { IComposition } from "./IComposition";

export interface IListComposition<T> extends IComposition {
  list: T[];

  onDidMount(): Promise<void>;
}

import { IAdapter } from "./IAdapter";

export interface IListAdapter<T> extends IAdapter {
  list: T[];

  onDidMount(): Promise<void>;
}

import { IEditCompositionActions, IEditCompositionAdapter } from "./IEditComposition";
import { IListCompositionActions, IListCompositionAdapter } from "./IListComposition";

export interface IUnionCompositionAdapter<T> extends IListCompositionAdapter<T>, IEditCompositionAdapter {}

export interface IUnionCompositionActions<CHANGE> extends IListCompositionActions, IEditCompositionActions<CHANGE> {}

export interface IUnionComposition<T, CHANGE> {
  adapter: IUnionCompositionAdapter<T>;
  actions: IUnionCompositionActions<CHANGE>;
}

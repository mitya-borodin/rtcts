import { History } from "history";
import { extendObservable } from "mobx";
import { IForm } from "../interfaces/IForm";
import { IPersist } from "../interfaces/IPersist";
import { EditAdapter } from "./EditAdapter";
import { IRepository } from "./interfaces/IRepository";
import { IRepositoryFormStore } from "./interfaces/IRepositoryFormStore";
import { IUnionComposition, IUnionCompositionActions, IUnionCompositionAdapter } from "./interfaces/IUnionComposition";

export class UnionAdapter<
  P extends IPersist,
  F extends IForm,
  CHANGE,
  REP extends IRepository<P>,
  FS extends IRepositoryFormStore<F, CHANGE>,
  H extends History = History
> extends EditAdapter<P, F, CHANGE, FS, REP, H> implements IUnionComposition<P, CHANGE> {
  // API
  public adapter: IUnionCompositionAdapter<P>;
  public actions: IUnionCompositionActions<CHANGE>;

  constructor(repository: REP, formStore: FS, history: H) {
    super(repository, formStore, history);

    // API
    this.adapter = extendObservable(this.adapter, {
      get list(): P[] {
        return repository.list;
      },
    });
  }
}

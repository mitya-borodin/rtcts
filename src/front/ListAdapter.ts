import { observable } from "mobx";
import { IListComposition, IListCompositionActions, IListCompositionAdapter } from "./interfaces/IListComposition";
import { IRepository } from "./interfaces/IRepository";

export class ListAdapter<T, R extends IRepository<T> = IRepository<T>, H extends History = History>
  implements IListComposition<T> {
  // API
  public adapter: IListCompositionAdapter<T>;
  public actions: IListCompositionActions;

  protected repository: R;
  protected history: H;

  constructor(repository: R, history: H) {
    this.repository = repository;
    this.history = history;

    this.onDidMount = this.onDidMount.bind(this);

    const self = this;

    this.adapter = observable.object({
      get history(): H {
        return self.history;
      },
      get isInit(): boolean {
        return self.repository.isInit;
      },
      get isLoading(): boolean {
        return self.repository.isLoading;
      },
      get list(): T[] {
        return self.repository.list;
      },
    });

    this.actions = {
      // HOOKS
      onDidMount: this.onDidMount,
    };
  }

  private async onDidMount() {
    await this.repository.init();
  }
}

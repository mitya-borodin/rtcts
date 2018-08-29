import { computed } from "mobx";
import { IListAdapter } from "./interfaces/IListAdapter";
import { IRepository } from "./interfaces/IRepository";

export class ListAdapter<T, R extends IRepository<T> = IRepository<T>> implements IListAdapter<T> {
  protected repository: R;

  constructor(repository: R) {
    this.repository = repository;

    this.onDidMount = this.onDidMount.bind(this);
  }

  @computed
  get isInit(): boolean {
    return this.repository.isInit;
  }

  @computed
  get isLoading(): boolean {
    return this.repository.isLoading;
  }

  @computed
  get list(): T[] {
    return this.repository.list;
  }

  public async onDidMount() {
    await this.repository.init();
  }
}

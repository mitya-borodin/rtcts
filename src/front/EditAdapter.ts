import { History } from "history";
import { action, extendObservable, observable } from "mobx";
import * as qs from "querystringify";
import { IForm } from "../interfaces/IForm";
import { IPersist } from "../interfaces/IPersist";
import { IValidateResult } from "../interfaces/IValidateResult";
import { isString, isUndefined } from "../utils/isType";
import { IEditComposition, IEditCompositionActions, IEditCompositionAdapter } from "./interfaces/IEditComposition";
import { IRepository } from "./interfaces/IRepository";
import { IRepositoryFormStore } from "./interfaces/IRepositoryFormStore";

export class EditAdapter<
  P extends IPersist,
  F extends IForm,
  CHANGE,
  FS extends IRepositoryFormStore<F, CHANGE>,
  REP extends IRepository<P>,
  H extends History = History
> implements IEditComposition<CHANGE> {
  // API
  public adapter: IEditCompositionAdapter;
  public actions: IEditCompositionActions<CHANGE>;

  // DEPS
  protected repository: REP;
  protected formStore: FS;
  protected history: H;

  // OBSERVABLE_PROPS
  @observable protected isLoading: boolean = false;
  @observable protected showAlerts: boolean = false;

  constructor(repository: REP, formStore: FS, history: H) {
    // DEPS
    this.repository = repository;
    this.formStore = formStore;
    this.history = history;

    // BINDS
    this.change = this.change.bind(this);
    this.save = this.save.bind(this);
    this.remove = this.remove.bind(this);
    this.cancel = this.cancel.bind(this);
    this.onDidMount = this.onDidMount.bind(this);

    const self = this;

    this.adapter = {
      get isEdit(): boolean {
        const { id }: any = qs.parse(self.history.location.search);

        return isString(id);
      },
    } as IEditCompositionAdapter;

    // API
    this.adapter = extendObservable<IEditCompositionAdapter, {}>(this.adapter, {
      get history(): H {
        return self.history;
      },
      get isInit(): boolean {
        return self.repository.isInit;
      },
      get isLoading(): boolean {
        return self.repository.isLoading || self.isLoading;
      },
      get isOpen(): boolean {
        return !isUndefined(self.formStore.form);
      },
      get showAlerts(): boolean {
        return self.formStore.showAlerts || self.showAlerts;
      },
      get validate(): IValidateResult {
        return self.formStore.validate;
      },
    });

    // API
    this.actions = {
      change: this.change,
      save: this.save,
      // tslint:disable-next-line:object-literal-sort-keys
      remove: this.remove,
      cancel: this.cancel,

      // HOOKS
      onDidMount: this.onDidMount,
    };
  }

  // HELPERS
  @action
  protected start(): void {
    this.isLoading = true;
  }

  @action
  protected end(): void {
    this.isLoading = false;
  }

  @action
  protected show(): void {
    this.showAlerts = true;
  }

  @action
  protected hide(): void {
    this.showAlerts = false;
  }

  // HOOKS
  protected async onDidMount() {
    await this.repository.init();
  }

  // FORM
  protected change(change: CHANGE): void {
    this.formStore.change(change);
  }

  @action
  protected async save(): Promise<void> {
    try {
      this.start();

      if (this.formStore.isValid) {
        this.hide();

        await this.formStore.submit();
      } else {
        this.show();
      }
    } catch (error) {
      console.error(error);

      return Promise.reject();
    } finally {
      this.end();
    }
  }

  @action
  protected async remove(): Promise<void> {
    try {
      this.start();

      const { id }: any = qs.parse(this.history.location.search);

      if (isString(id)) {
        await this.repository.remove(id);
      } else {
        throw new Error(`[ ${this.constructor.name} ][ remove ][ ID_NOT_FOUND ]`);
      }
    } catch (error) {
      console.error(error);

      return Promise.reject();
    } finally {
      this.end();
    }
  }

  @action
  protected cancel(): void {
    this.history.goBack();

    this.hide();
    this.end();

    setTimeout(this.formStore.cancel, 100);
  }
}

import { History } from "history";
import { action, computed, observable } from "mobx";
import * as qs from "querystringify";
import { IForm } from "../interfaces/IForm";
import { IPersist } from "../interfaces/IPersist";
import { IValidateResult } from "../interfaces/IValidateResult";
import { isString, isUndefined } from "../utils/isType";
import { IEditComposition } from "./interfaces/IEditComposition";
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
  // PROPS
  @observable public isLoading: boolean = false;
  @observable public showAlerts: boolean = false;
  public shockDelay: number;

  // DEPS
  protected repository: REP;
  protected formStore: FS;
  protected history: H;

  constructor(repository: REP, formStore: FS, history: H) {
    // DEPS
    this.repository = repository;
    this.formStore = formStore;
    this.history = history;

    // PROPS
    this.shockDelay = 1000;

    // BINDS
    this.onDidMount = this.onDidMount.bind(this);
    this.change = this.change.bind(this);
    this.save = this.save.bind(this);
    this.remove = this.remove.bind(this);
    this.cancel = this.cancel.bind(this);
  }

  @computed
  get isInit(): boolean {
    return this.repository.isInit;
  }

  @computed
  get isOpen(): boolean {
    return !isUndefined(this.formStore.form);
  }

  @computed
  get isEdit(): boolean {
    const { id }: any = qs.parse(this.history.location.search);

    return isString(id);
  }

  @computed
  get validate(): IValidateResult {
    return this.formStore.validate;
  }

  public async onDidMount() {
    await this.repository.init();
  }

  public change(change: CHANGE): void {
    this.formStore.change(change);
  }

  @action
  public async save(): Promise<void> {
    try {
      this.start();

      if (this.formStore.isValid) {
        this.hide();

        await this.formStore.save();
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
  public async remove(): Promise<void> {
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
  public cancel(): void {
    this.history.goBack();

    this.show();
    this.end();

    setTimeout(this.formStore.cancel, 100);
  }

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
}

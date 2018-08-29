import { History } from "history";
import { action, computed, observable } from "mobx";
import * as qs from "querystringify";
import { IForm } from "../interfaces/IForm";
import { IPersist } from "../interfaces/IPersist";
import { IValidateResult } from "../interfaces/IValidate";
import { ValidateResult } from "../isomorphic/ValidateResult";
import { isString } from "../utils/isType";
import { IEditAdapter } from "./interfaces/IEditAdapter";
import { IRepository } from "./interfaces/IRepository";
import { IRepositoryFormStore } from "./interfaces/IRepositoryFormStore";
import { IUIStore } from "./interfaces/IUIStore";

export class EditAdapter<
  P extends IPersist,
  F extends IForm,
  C,
  FS extends IRepositoryFormStore<F, C>,
  UIS extends IUIStore<U>,
  R extends IRepository<P>,
  U extends IForm,
  H extends History = History
> implements IEditAdapter<U, C> {
  // PROPS
  @observable public isLoading: boolean = false;
  @observable public showAlerts: boolean = false;
  public shockDelay: number;

  // DEPS
  protected repository: R;
  protected formStore: FS;
  protected UIStore: UIS;
  protected UIClass: { new (data?: any): U };
  protected history: H;

  constructor(repository: R, formStore: FS, UIStore: UIS, UIClass: { new (data: any): U }, history: H) {
    // DEPS
    this.repository = repository;
    this.formStore = formStore;
    this.UIStore = UIStore;
    this.UIClass = UIClass;
    this.history = history;

    // PROPS
    this.shockDelay = 1000;

    // BINDS
    this.onDidMount = this.onDidMount.bind(this);
    this.onChange = this.onChange.bind(this);
    this.save = this.save.bind(this);
    this.remove = this.remove.bind(this);
    this.cancel = this.cancel.bind(this);
  }

  @computed
  get isInit(): boolean {
    return this.repository.isInit;
  }

  @computed
  get isEdit(): boolean {
    const { id }: any = qs.parse(this.history.location.search);

    return isString(id);
  }

  @computed
  get UI(): U {
    const UI = this.UIStore.UI;

    if (UI instanceof this.UIClass) {
      return UI;
    }

    return new this.UIClass();
  }

  @computed
  get validate(): IValidateResult {
    const UI = this.UIStore.UI;

    if (UI instanceof this.UIClass) {
      return UI.validate();
    }

    return new ValidateResult([]);
  }

  public async onDidMount() {
    await this.repository.init();

    const { id }: any = qs.parse(this.history.location.search);

    if (isString(id)) {
      this.formStore.open(id);
    } else {
      this.formStore.open();
    }
  }

  public onChange(change: C): void {
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

import { IForm, IInsert, IPersist, IUser, IValidateResult, userRepositoryEventEnum } from "@borodindmitriy/interfaces";
import { IMediator, ValidateResult } from "@borodindmitriy/isomorphic";
import { isString } from "@borodindmitriy/utils";
import { action, computed, observable, runInAction } from "mobx";
import { ICommonStore } from "./interfaces/ICommonStore";
import { ICommonStoreForm } from "./interfaces/ICommonStoreForm";

export class CommonStoreForm<
  PERSIST extends IPersist,
  INSERT extends IInsert,
  FORM extends IForm,
  CHANGE,
  STORE extends ICommonStore<PERSIST> = ICommonStore<PERSIST>,
  ME extends IMediator = IMediator,
  USER extends IUser & IPersist = IUser & IPersist
> implements ICommonStoreForm<FORM, CHANGE> {
  // PUBLIC_PROPS
  @observable
  public isLoading: boolean = false;
  @observable
  public isValid: boolean = false;
  @observable
  public showAlerts: boolean = false;
  @observable
  public form: FORM | void;

  // DEPS
  protected readonly Persist: new (...args: any[]) => PERSIST;
  protected readonly Insert: new (...args: any[]) => INSERT;
  protected readonly Form: new (...args: any[]) => FORM;
  protected readonly store: STORE;
  protected readonly ACL: {
    save: string[];
  };
  protected mediator: ME;
  protected UserPersist: new (data?: any) => USER;

  // PROPS
  protected user: USER | void;
  protected group: string;

  constructor(
    Persist: new (...args: any[]) => PERSIST,
    Insert: new (...args: any[]) => INSERT,
    Form: new (...args: any[]) => FORM,
    store: STORE,
    ACL: {
      save: string[];
    },
    mediator: ME,
    UserPersist: new (data?: any) => USER,
  ) {
    // DEPS
    this.Persist = Persist;
    this.Insert = Insert;
    this.Form = Form;
    this.store = store;
    this.ACL = ACL;
    this.mediator = mediator;
    this.UserPersist = UserPersist;

    // PROSP
    this.group = "";
    this.user = undefined;

    // SUBSCRIPTIONS
    this.mediator.on(userRepositoryEventEnum.SET_USER, (user: USER) => {
      if (user instanceof this.UserPersist) {
        this.user = user;
      }
    });

    this.mediator.on(userRepositoryEventEnum.CLEAR_USER, () => {
      this.user = undefined;
    });

    this.mediator.on(userRepositoryEventEnum.SET_USER_GROUP, (group: string) => {
      if (isString(group)) {
        this.group = group;
      }
    });

    this.mediator.on(userRepositoryEventEnum.CLEAR_USER_GROUP, () => {
      this.group = "";
    });

    // BINDS
    this.setIsValid = this.setIsValid.bind(this);
    this.open = this.open.bind(this);
    this.change = this.change.bind(this);
    this.submit = this.submit.bind(this);
    this.cancel = this.cancel.bind(this);
  }

  @computed({ name: "[ COMMON_STORE_FORM ][ ID ]" })
  get id(): string | void {
    if (this.form instanceof this.Form) {
      return this.form.id;
    }
  }

  @computed({ name: "[ COMMON_STORE_FORM ][ VALIDATE ]" })
  get validate(): IValidateResult {
    if (this.form instanceof this.Form) {
      return this.form.validate();
    }

    return new ValidateResult([]);
  }

  @action("[ COMMON_STORE_FORM ][ SET_IS_VALID ]")
  public setIsValid(isValid: boolean): void {
    this.isValid = isValid;
  }

  public async open(): Promise<void> {
    if (this.store.data instanceof this.Persist) {
      const form = await this.openAssign(this.store.data);

      runInAction("[ COMMON_STORE_FORM ][ OPEN_ASSIGN ][ UPDATE_MODE ]", () => {
        this.form = form;
      });

      this.setIsValid(this.validate.isValid);
    } else {
      const form = await this.openAssign();

      runInAction("[ COMMON_STORE_FORM ][ OPEN_ASSIGN ][ CREATE_MODE ]", () => {
        this.form = form;
      });

      this.setIsValid(false);
    }
  }

  public async change(change: CHANGE): Promise<void> {
    if (this.form instanceof this.Form) {
      const form = await this.changeAssign(this.form, change);

      runInAction("[ COMMON_STORE_FORM ][ CHANGE_ASSIGN ]", () => {
        this.form = form;
      });

      this.setIsValid(this.validate.isValid);
    } else {
      console.error(`[ ${this.constructor.name} ][ try change on closed form ]`, this.form, change);
    }
  }

  @action("[ COMMON_STORE_FORM ][ SUBMIT ]")
  public async submit(): Promise<void> {
    this.setIsValid(this.validate.isValid);

    if (this.ACL.save.includes(this.group)) {
      if (this.isValid) {
        this.showAlerts = false;

        if (this.form instanceof this.Form) {
          const persist = new this.Persist(this.form.toJS());

          await this.store.update(persist.toJS());
        } else {
          console.error(`[ ${this.constructor.name} ][ FORM IS NOT INSTANCE_OF ${this.Form.name} ]`);
        }
      } else {
        this.showAlerts = true;

        console.error(`[ ${this.constructor.name} ][ FORM ][ IS_NOT_VALID ]`);
      }
    } else {
      console.error(`[ ${this.constructor.name} ][ ACCESS_DENIED ]`);
    }
  }

  @action("[ COMMON_STORE_FORM ][ CANCEL ]")
  public cancel(): void {
    this.isValid = false;
    this.showAlerts = false;
    this.form = undefined;
  }

  @action("[ START_LOADING ]")
  public startLoading(): void {
    this.isLoading = true;
  }

  @action("[ END_LOADING ]")
  public endLoading(): void {
    this.isLoading = false;
  }

  protected async openAssign(persist?: PERSIST): Promise<FORM> {
    if (persist instanceof this.Persist) {
      return new this.Form(persist.toJS());
    }

    return new this.Form();
  }

  protected async changeAssign(form: FORM, change: CHANGE): Promise<FORM> {
    console.log(change);
    return form;
  }
}

import { action, computed, observable } from "mobx";
import { userRepositoryEventEnum } from "../enums/userRepositoryEventEnum";
import { IForm } from "../interfaces/IForm";
import { IInsert } from "../interfaces/IInsert";
import { IPersist } from "../interfaces/IPersist";
import { IUser } from "../interfaces/IUser";
import { IValidateResult } from "../interfaces/IValidate";
import { ValidateResult } from "../isomorphic/ValidateResult";
import { isString } from "../utils/isType";
import { IMediator } from "./interfaces/IMediator";
import { IRepository } from "./interfaces/IRepository";
import { IRepositoryFormStore } from "./interfaces/IRepositoryFormStore";

export class RepositoryFormStore<
  P extends IPersist,
  I extends IInsert,
  F extends IForm,
  C,
  REP extends IRepository<P> = IRepository<P>,
  ME extends IMediator = IMediator,
  USER extends IUser & IPersist = IUser & IPersist
> implements IRepositoryFormStore<F, C> {
  // PUBLIC_PROPS
  @observable public form: F | void;
  @observable public isNew: boolean;
  @observable public isEdit: boolean;
  @observable public showAlerts: boolean;
  @observable public isValid: boolean;

  // DEPS
  protected readonly Persist: { new (...args: any[]): P };
  protected readonly Insert: { new (...args: any[]): I };
  protected readonly Form: { new (...args: any[]): F };
  protected readonly repository: REP;
  protected readonly ACL: {
    save: string[];
  };
  protected mediator: ME;
  protected UserPersist: { new (data?: any): USER };

  // PROPS
  protected user: USER | void;
  private group: string;

  constructor(
    Persist: { new (...args: any[]): P },
    Insert: { new (...args: any[]): I },
    Form: { new (...args: any[]): F },
    repository: REP,
    ACL: {
      save: string[];
    },
    mediator: ME,
    UserPersist: { new (data?: any): USER },
  ) {
    // DEPS
    this.Persist = Persist;
    this.Insert = Insert;
    this.Form = Form;
    this.repository = repository;
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
    this.save = this.save.bind(this);
    this.cancel = this.cancel.bind(this);
  }

  @computed
  get id(): string | void {
    if (this.form instanceof this.Form) {
      return this.form.id;
    }
  }

  @computed
  get validate(): IValidateResult {
    if (this.form instanceof this.Form) {
      return this.form.validate();
    }

    return new ValidateResult([]);
  }

  @action
  public setIsValid(isValid: boolean): void {
    this.isValid = isValid;
  }

  public open(id?: string): void {
    if (isString(id)) {
      const persist = this.repository.map.get(id);

      if (persist instanceof this.Persist) {
        this.form = this.openAssign(persist);

        this.setIsValid(this.form.validate().isValid);
      } else {
        console.error(`[ ${this.constructor.name} ][ open ][ ${this.Persist.name} ][ NOT_FOUND ]`);
      }
    } else {
      this.form = this.openAssign();
    }
  }

  public async change(change: C): Promise<void> {
    if (this.form instanceof this.Form) {
      this.form = this.changeAssign(this.form, change);

      const { isValid }: IValidateResult = this.form.validate();

      this.setIsValid(isValid);
    } else {
      console.error(`[ ${this.constructor.name} ][ try change on closed form ]`, this.form, change);
    }
  }

  public async save(): Promise<void> {
    if (this.ACL.save.includes(this.group)) {
      if (this.isValid) {
        if (this.form instanceof this.Form) {
          if (isString(this.form.id)) {
            const persist = new this.Persist(this.form.toJS());

            await this.repository.update(persist.toJS());
          } else {
            const insert = new this.Insert(this.form.toJS());

            await this.repository.create(insert.toJS());
          }
        } else {
          console.error(`[ ${this.constructor.name} ][ FORM IS NOT INSTANCEOF ${this.Form.name} ]`);
        }
      } else {
        console.error(`[ ${this.constructor.name} ][ FORM IS NOT CORRECTLY FILLED IN ]`);
      }
    } else {
      console.error(`[ ${this.constructor.name} ][ ACCESS_DENIED ]`);
    }
  }

  public cancel(): void {
    this.form = undefined;
    this.isNew = false;
    this.isEdit = false;
    this.isEdit = false;
    this.isValid = false;
  }

  protected openAssign(persist?: P): F {
    if (persist instanceof this.Persist) {
      return new this.Form(persist.toJS());
    }

    return new this.Form();
  }

  protected changeAssign(form: F, change: C): F {
    console.log(change);
    return form;
  }
}

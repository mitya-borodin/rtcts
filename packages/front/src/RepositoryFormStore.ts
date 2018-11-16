import { IForm, IInsert, IPersist, IUser, IValidateResult, userRepositoryEventEnum } from "@borodindmitriy/interfaces";
import { ValidateResult } from "@borodindmitriy/isomorphic";
import { isString } from "@borodindmitriy/utils";
import { action, computed, observable, runInAction } from "mobx";
import { IMediator } from "./interfaces/IMediator";
import { IRepository } from "./interfaces/IRepository";
import { IRepositoryFormStore } from "./interfaces/IRepositoryFormStore";

export class RepositoryFormStore<
  PERSIST extends IPersist,
  INSERT extends IInsert,
  FORM extends IForm,
  CHANGE,
  REP extends IRepository<PERSIST> = IRepository<PERSIST>,
  ME extends IMediator = IMediator,
  USER extends IUser & IPersist = IUser & IPersist
> implements IRepositoryFormStore<FORM, CHANGE> {
  // PUBLIC_PROPS
  @observable
  public isValid: boolean = false;
  @observable
  public showAlerts: boolean = false;
  @observable
  public form: FORM | void;

  // DEPS
  protected readonly Persist: { new (...args: any[]): PERSIST };
  protected readonly Insert: { new (...args: any[]): INSERT };
  protected readonly Form: { new (...args: any[]): FORM };
  protected readonly repository: REP;
  protected readonly ACL: {
    save: string[];
  };
  protected mediator: ME;
  protected UserPersist: { new (data?: any): USER };

  // PROPS
  protected user: USER | void;
  protected group: string;

  constructor(
    Persist: { new (...args: any[]): PERSIST },
    Insert: { new (...args: any[]): INSERT },
    Form: { new (...args: any[]): FORM },
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
    this.submit = this.submit.bind(this);
    this.cancel = this.cancel.bind(this);
  }

  @computed({ name: "[ REPOSITORY_FORM_STORE ][ ID ]" })
  get id(): string | void {
    if (this.form instanceof this.Form) {
      return this.form.id;
    }
  }

  @computed({ name: "[ REPOSITORY_FORM_STORE ][ VALIDATE ]" })
  get validate(): IValidateResult {
    if (this.form instanceof this.Form) {
      return this.form.validate();
    }

    return new ValidateResult([]);
  }

  @action("[ REPOSITORY_FORM_STORE ][ SET_IS_VALID ]")
  public setIsValid(isValid: boolean): void {
    this.isValid = isValid;
  }

  @action("[ REPOSITORY_FORM_STORE ][ OPEN ]")
  public async open(id?: string): Promise<void> {
    if (isString(id)) {
      const persist = this.repository.map.get(id);

      if (persist instanceof this.Persist) {
        const form = await this.openAssign(persist);

        runInAction("[ REPOSITORY_FORM_STORE ][ OPEN_ASSIGN ][ UPDATE ]", () => {
          this.form = form;
        });

        this.setIsValid(this.validate.isValid);
      } else {
        console.error(`[ ${this.constructor.name} ][ open ][ ${this.Persist.name} ][ NOT_FOUND ]`);
      }
    } else {
      const form = await this.openAssign();

      runInAction("[ REPOSITORY_FORM_STORE ][ OPEN_ASSIGN ][ CREATE ]", () => {
        this.form = form;
      });

      this.setIsValid(false);
    }
  }

  @action("[ REPOSITORY_FORM_STORE ][ CHANGE ]")
  public async change(change: CHANGE): Promise<void> {
    if (this.form instanceof this.Form) {
      const form = await this.changeAssign(this.form, change);

      runInAction("[ REPOSITORY_FORM_STORE ][ CHANGE_ASSIGN ]", () => {
        this.form = form;
      });

      this.setIsValid(this.validate.isValid);
    } else {
      console.error(`[ ${this.constructor.name} ][ try change on closed form ]`, this.form, change);
    }
  }

  @action("[ REPOSITORY_FORM_STORE ][ SUBMIT ]")
  public async submit(): Promise<void> {
    this.setIsValid(this.validate.isValid);

    if (this.ACL.save.includes(this.group)) {
      if (this.isValid) {
        this.showAlerts = false;

        if (this.form instanceof this.Form) {
          if (isString(this.form.id)) {
            const persist = new this.Persist(this.form.toJS());

            await this.repository.update(persist.toJS());
          } else {
            const insert = new this.Insert(this.form.toJS());

            await this.repository.create(insert.toJS());
          }
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

  @action("[ REPOSITORY_FORM_STORE ][ CANCEL ]")
  public cancel(): void {
    this.isValid = false;
    this.showAlerts = false;
    this.form = undefined;
  }

  @action("[ REPOSITORY_FORM_STORE ][ OPEN_ASSIGN ]")
  protected async openAssign(persist?: PERSIST): Promise<FORM> {
    if (persist instanceof this.Persist) {
      return new this.Form(persist.toJS());
    }

    return new this.Form();
  }

  @action("[ REPOSITORY_FORM_STORE ][ CHANGE_ASSIGN ]")
  protected async changeAssign(form: FORM, change: CHANGE): Promise<FORM> {
    console.log(change);
    return form;
  }
}
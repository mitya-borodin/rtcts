import { IEntity, IForm, IInsert } from "@borodindmitriy/interfaces";
import { isString } from "@borodindmitriy/utils";
import { IFormStore } from "../../interfaces/form/IFormStore";
import { ISingletonRepository } from "../../interfaces/repository/ISingletonRepository";
import { FormStore } from "./FormStore";

export class SingletonFormStore<
  ENTITY extends IEntity,
  INSERT extends IInsert,
  FORM extends IForm,
  CHANGE,
  REP extends ISingletonRepository<ENTITY>
> extends FormStore<FORM, CHANGE> implements IFormStore<FORM, CHANGE> {
  public static events = {
    submit: `[ SingletonFormStore ][ SUBMIT ]`,
  };

  protected readonly Entity: new (...args: any[]) => ENTITY;
  protected readonly Insert: new (...args: any[]) => INSERT;
  protected readonly repository: REP;

  constructor(
    Entity: new (...args: any[]) => ENTITY,
    Insert: new (...args: any[]) => INSERT,
    Form: new (...args: any[]) => FORM,
    repository: REP,
  ) {
    super(Form);

    // * DEPS
    this.Entity = Entity;
    this.Insert = Insert;
    this.repository = repository;

    // * BINDS
    this.openForm = this.openForm.bind(this);
    this.changeForm = this.changeForm.bind(this);
    this.submitForm = this.submitForm.bind(this);
  }

  protected async openForm(): Promise<FORM> {
    if (this.repository.entity instanceof this.Entity) {
      return new this.Form(this.repository.entity.toJS());
    }

    console.warn("You should try call init()");

    return new this.Form();
  }

  protected async submitForm(submit: FORM): Promise<void> {
    let result: ENTITY | void;

    if (isString(submit.id)) {
      const entity: ENTITY = new this.Entity(submit.toJS());

      result = await this.repository.update(entity.toJS());
    } else {
      const insert: INSERT = new this.Insert(submit.toJS());

      result = await this.repository.update(insert.toJS());
    }

    this.emit(SingletonFormStore.events.submit, result);
  }
}

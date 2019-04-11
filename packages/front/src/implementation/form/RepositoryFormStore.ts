import { IEntity, IForm, IInsert } from "@borodindmitriy/interfaces";
import { isString } from "@borodindmitriy/utils";
import { IFormStore } from "../../interfaces/form/IFormStore";
import { IRepository } from "../../interfaces/repository/IRepository";
import { Repository } from "../repository/Repository";
import { FormStore } from "./FormStore";

export class RepositoryFormStore<
  ENTITY extends IEntity,
  INSERT extends IInsert,
  FORM extends IForm,
  CHANGE,
  REP extends IRepository<ENTITY>
> extends FormStore<FORM, CHANGE> implements IFormStore<FORM, CHANGE> {
  public static events = {
    submit: `[ RepositoryFormStore ][ SUBMIT ]`,
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

    // ! SUBSCRIPTIONS
    this.repository.on(Repository.events.remove_submit, this.cancel);
  }

  protected async openForm(id?: string): Promise<FORM> {
    if (isString(id) && id.length > 0) {
      const entity: ENTITY | void = this.repository.map.get(id);

      if (entity instanceof this.Entity) {
        return new this.Form(entity.toJS());
      }
    }

    return new this.Form();
  }

  protected async submitForm(submit: FORM): Promise<void> {
    const result: ENTITY | void = await this.submitToRepository(submit);

    this.emit(RepositoryFormStore.events.submit, result);
  }

  protected async submitToRepository(submit: FORM): Promise<ENTITY | void> {
    if (isString(submit.id)) {
      const entity: ENTITY = new this.Entity(submit.toJS());

      return await this.repository.update(entity.toJS());
    } else {
      const insert: INSERT = new this.Insert(submit.toJS());

      return await this.repository.create(insert.toJS());
    }
  }
}

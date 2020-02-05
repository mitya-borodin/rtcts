import { Repository } from "../repository/Repository";
import { FormStore } from "./FormStore";

export class RepositoryFormStore<
  REP extends IRepository<ENTITY>,
  CHANGE,
  ENTITY extends Entity<DATA, VA>,
  DATA,
  VA extends object = object
> extends FormStore<CHANGE, ENTITY, DATA, VA> {
  public static events = {
    submit: `[ RepositoryFormStore ][ SUBMIT ]`,
  };
  protected readonly Entity: new (...args: any[]) => ENTITY;
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

  protected async openForm(id?: string, ...args: any[]): Promise<FORM> {
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

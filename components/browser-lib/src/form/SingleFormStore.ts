import { Entity } from "@rtcts/isomorphic";
import { isString, getErrorMessage } from "@rtcts/utils";
import { FormStore } from "./FormStore";
import { SingleRepositoryPubSubEnum } from "../enums/SingleRepositoryPubSubEnum";

export class SingleFormStore<
  ENTITY extends Entity<DATA, any[]>,
  DATA,
  CHANGE,
  REP extends SingletonRepository<ENTITY>
> extends FormStore<ENTITY, DATA, CHANGE> {
  protected readonly Entity: new (...args: any[]) => ENTITY;
  protected readonly repository: REP;

  constructor(Entity: new (...args: any[]) => ENTITY, repository: REP) {
    super(Entity);

    this.repository = repository;

    this.openForm = this.openForm.bind(this);
    this.changeForm = this.changeForm.bind(this);
    this.submitForm = this.submitForm.bind(this);
  }

  protected async openForm(): Promise<ENTITY> {
    if (this.repository.entity instanceof this.Entity) {
      return new this.Entity(this.repository.entity.toObject());
    }

    console.warn("You should try call init()");

    return new this.Entity();
  }

  protected async submitForm(submit: ENTITY): Promise<void> {
    try {
      let result: ENTITY | undefined;

      if (isString(submit.id)) {
        const entity: ENTITY = new this.Entity(submit.toObject());

        if (entity.isEntity()) {
          result = await this.repository.update(entity);
        }
      } else {
        const insert: ENTITY = new this.Entity(submit.toObject());

        if (insert.canBeInsert()) {
          result = await this.repository.update(insert);
        }
      }

      this.emit(SingleRepositoryPubSubEnum.submit, result);
    } catch (error) {
      console.error(`[ ${this.constructor.name} ][ SUBMIT_FORM ][ ${getErrorMessage(error)} ]`);
    }
  }
}

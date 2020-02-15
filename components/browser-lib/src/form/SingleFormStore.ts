import { Entity } from "@rtcts/isomorphic";
import { isString, getErrorMessage } from "@rtcts/utils";
import { FormStore } from "./FormStore";
import { SingleRepositoryPubSubEnum } from "../enums/SingleRepositoryPubSubEnum";
import { SingleObjectRepository } from "../repository/SingleObjectRepository";
import { SingleObjectHttpTransport } from "../transport/http/SingleObjectHttpTransport";
import { WSClient } from "../transport/ws/WSClient";
import EventEmitter from "eventemitter3";

export class SingleFormStore<
  HTTP_TRANSPORT extends SingleObjectHttpTransport<ENTITY, DATA, VA, WS, PUB_SUB>,
  ENTITY extends Entity<DATA, VA>,
  DATA,
  REP extends SingleObjectRepository<HTTP_TRANSPORT, ENTITY, DATA, VA, WS, PUB_SUB>,
  VA extends object = object,
  WS extends WSClient = WSClient,
  PUB_SUB extends EventEmitter = EventEmitter
> extends FormStore<ENTITY, DATA, VA> {
  protected readonly Entity: new (data?: any) => ENTITY;
  protected readonly repository: REP;

  constructor(Entity: new (data?: any) => ENTITY, repository: REP) {
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

    console.warn(`Initialize the repository before you begin using ${this.constructor.name}`);

    return new this.Entity();
  }

  protected async submitForm(submit: ENTITY): Promise<void> {
    try {
      let result: ENTITY | void;

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
      console.error(`Submit (${this.constructor.name}) has been filed: ${getErrorMessage(error)}`);
    }
  }
}

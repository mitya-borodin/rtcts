/* eslint-disable no-unused-vars */
import { Entity, ValidationResult } from "@rtcts/isomorphic";
import { getErrorMessage } from "@rtcts/utils";
import EventEmitter from "eventemitter3";
import { computed } from "mobx";
import { SingleRepositoryPubSubEnum } from "../enums/SingleRepositoryPubSubEnum";
import { SingleObjectRepository } from "../repository/SingleObjectRepository";
import { SingleObjectHttpTransport } from "../transport/http/SingleObjectHttpTransport";
import { WSClient } from "../transport/ws/WSClient";
import { EntityFormStore } from "./EntityFormStore";

export class SingleFormStore<
  HTTP_TRANSPORT extends SingleObjectHttpTransport<ENTITY, WS, PUB_SUB>,
  ENTITY extends Entity,
  DATA,
  REP extends SingleObjectRepository<HTTP_TRANSPORT, ENTITY, WS, PUB_SUB>,
  WS extends WSClient = WSClient,
  PUB_SUB extends EventEmitter = EventEmitter
> extends EntityFormStore<ENTITY, DATA> {
  protected readonly Entity: new (data?: any) => ENTITY;
  protected readonly repository: REP;

  constructor(Entity: new (data?: any) => ENTITY, repository: REP) {
    super(Entity);

    this.Entity = Entity;
    this.repository = repository;

    this.openForm = this.openForm.bind(this);
    this.changeForm = this.changeForm.bind(this);
    this.submitForm = this.submitForm.bind(this);
  }

  @computed({ name: "SingleFormStore.externalValidationResult" })
  get externalValidationResult(): ValidationResult {
    return this.repository.validationResult;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
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

      if (submit.hasId()) {
        const entity: ENTITY = new this.Entity(submit.toObject());

        if (entity.isEntity()) {
          result = await this.repository.update(entity);
        }
      } else {
        const insert: ENTITY = new this.Entity(submit.toObject());

        if (insert.isInsert()) {
          result = await this.repository.update(insert);
        }
      }

      this.emit(SingleRepositoryPubSubEnum.submit, result);
    } catch (error) {
      console.error(`Submit (${this.constructor.name}) has been filed: ${getErrorMessage(error)}`);
    }
  }
}

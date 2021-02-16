/* eslint-disable no-unused-vars */
import { Entity, ValidationResult } from "@rtcts/isomorphic";
import { isString } from "@rtcts/utils";
import EventEmitter from "eventemitter3";
import { override } from "mobx";
import { Repository } from "../repository/Repository";
import { RepositoryHttpTransport } from "../transport/http/RepositoryHttpTransport";
import { WSClient } from "../transport/ws/WSClient";
import { EntityFormStore } from "./EntityFormStore";

export class RepositoryFormStore<
  HTTP_TRANSPORT extends RepositoryHttpTransport<ENTITY, WS, PUB_SUB>,
  ENTITY extends Entity,
  DATA,
  REP extends Repository<HTTP_TRANSPORT, ENTITY, WS, PUB_SUB>,
  WS extends WSClient = WSClient,
  PUB_SUB extends EventEmitter = EventEmitter
> extends EntityFormStore<ENTITY, DATA> {
  public static events = {
    submit: `[ RepositoryFormStore ][ SUBMIT ]`,
  };
  protected readonly Entity: new (...args: any[]) => ENTITY;
  protected readonly repository: REP;

  constructor(Entity: new (...args: any[]) => ENTITY, repository: REP) {
    super(Entity);

    this.Entity = Entity;

    // * DEPS
    this.repository = repository;

    // * BINDS
    this.openForm = this.openForm.bind(this);
    this.changeForm = this.changeForm.bind(this);
    this.submitForm = this.submitForm.bind(this);

    // ! SUBSCRIPTIONS
    this.repository.on(Repository.events.removeSubmit, this.cancel);
  }

  @override
  get externalValidationResult(): ValidationResult {
    return this.repository.validationResult;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  protected async openForm(id?: string, ...args: any[]): Promise<ENTITY> {
    if (isString(id) && id.length > 0) {
      const entity: ENTITY | void = this.repository.map.get(id);

      if (entity instanceof this.Entity) {
        return new this.Entity(entity.toObject());
      }
    }

    return new this.Entity({});
  }

  protected async submitForm(submit: ENTITY): Promise<ENTITY | void> {
    const result: ENTITY | void = await this.submitToRepository(submit);

    this.emit(RepositoryFormStore.events.submit, result);

    return result;
  }

  protected async submitToRepository(submit: ENTITY): Promise<ENTITY | void> {
    if (submit.hasId()) {
      const entity: ENTITY = new this.Entity(submit.toObject());

      if (entity.isEntity()) {
        return await this.repository.update(entity.toObject());
      }
    } else {
      const entity: ENTITY = new this.Entity(submit.toObject());

      if (entity.isInsert()) {
        return await this.repository.create(entity.toObject());
      }
    }
  }
}

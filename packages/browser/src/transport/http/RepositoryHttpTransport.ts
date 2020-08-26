import { Entity, ListResponse, Response } from "@rtcts/isomorphic";
import EventEmitter from "eventemitter3";
import { WSClient } from "../ws/WSClient";
import { BaseHttpTransport, BaseHttpTransportACL } from "./BaseHttpTransport";

export interface RepositoryHttpTransportACL extends BaseHttpTransportACL {
  collection: string[];
  read: string[];
  create: string[];
  update: string[];
  remove: string[];
}

export class RepositoryHttpTransport<
  ENTITY extends Entity,
  WS extends WSClient = WSClient,
  PUB_SUB extends EventEmitter = EventEmitter
> extends BaseHttpTransport<ENTITY, WS, PUB_SUB> {
  protected Entity: new (data: any) => ENTITY;

  public readonly ACL: RepositoryHttpTransportACL;

  constructor(
    name: string,
    Entity: new (data: any) => ENTITY,
    ws: WS,
    channelName: string,
    ACL: RepositoryHttpTransportACL,
    pubSub: PUB_SUB,
    root = "/api",
  ) {
    super(name, Entity, ws, channelName, ACL, pubSub, root);

    this.ACL = ACL;
    this.Entity = Entity;

    this.getList = this.getList.bind(this);
    this.getItem = this.getItem.bind(this);
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
    this.remove = this.remove.bind(this);
  }

  public async getList(): Promise<ListResponse<ENTITY> | void> {
    try {
      if (!this.ACL.collection.includes(this.currentUserGroup)) {
        return;
      }

      const payload: any | void = await this.getHttpRequest(`/${this.name}/list`);

      return this.prepareListPayload(payload);
    } catch (error) {
      console.error(error);
    }
  }

  public async getItem(id: string): Promise<Response<ENTITY> | void> {
    try {
      if (!this.ACL.read.includes(this.currentUserGroup)) {
        return;
      }

      const payload: any | void = await this.getHttpRequest(`/${this.name}/item/${id}`);

      return this.prepareItemPayload(payload);
    } catch (error) {
      console.error(error);
    }
  }

  public async create(input: object): Promise<Response<ENTITY> | void> {
    try {
      if (!this.ACL.create.includes(this.currentUserGroup)) {
        return;
      }

      const payload: any | void = await this.putHttpRequest(`/${this.name}/create`, input);

      return this.prepareItemPayload(payload);
    } catch (error) {
      console.error(error);
    }
  }

  public async update(input: object): Promise<Response<ENTITY> | void> {
    try {
      if (!this.ACL.update.includes(this.currentUserGroup)) {
        return;
      }

      const payload: any | void = await this.postHttpRequest(`/${this.name}/update`, input);

      return this.prepareItemPayload(payload);
    } catch (error) {
      console.error(error);
    }
  }

  public async remove(id: string): Promise<Response<ENTITY> | void> {
    try {
      if (!this.ACL.remove.includes(this.currentUserGroup)) {
        return;
      }

      const payload: any | void = await this.deleteHttpRequest(`/${this.name}/remove`, { id });

      return this.prepareItemPayload(payload);
    } catch (error) {
      console.error(error);
    }
  }
}

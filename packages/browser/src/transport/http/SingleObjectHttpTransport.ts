/* eslint-disable no-unused-vars */
import { Entity, Response } from "@rtcts/isomorphic";
import EventEmitter from "eventemitter3";
import { WSClient } from "../ws/WSClient";
import { BaseHttpTransport, BaseHttpTransportACL } from "./BaseHttpTransport";

export interface SingleObjectHttpTransportACL extends BaseHttpTransportACL {
  getItem: string[];
  update: string[];
}

export class SingleObjectHttpTransport<
  ENTITY extends Entity,
  WS extends WSClient = WSClient,
  PUB_SUB extends EventEmitter = EventEmitter
> extends BaseHttpTransport<ENTITY, WS, PUB_SUB> {
  protected Entity: new (data: any) => ENTITY;

  public readonly ACL: SingleObjectHttpTransportACL;

  constructor(
    name: string,
    Entity: new (data: any) => ENTITY,
    ws: WS,
    channelName: string,
    ACL: SingleObjectHttpTransportACL,
    pubSub: PUB_SUB,
    root = "/api",
  ) {
    super(name, Entity, ws, channelName, ACL, pubSub, root);

    this.ACL = ACL;
    this.Entity = Entity;

    this.getItem = this.getItem.bind(this);
    this.update = this.update.bind(this);
  }

  public async getItem(): Promise<Response<ENTITY> | void> {
    try {
      if (!this.ACL.getItem.includes(this.currentUserGroup)) {
        return;
      }

      const payload: any | void = await this.getHttpRequest(`/${this.name}/item`);

      return this.prepareItemPayload(payload);
    } catch (error) {
      console.error(error);
    }
  }

  public async update(data: object): Promise<Response<ENTITY> | void> {
    try {
      if (!this.ACL.update.includes(this.currentUserGroup)) {
        return;
      }

      const payload: any | void = await this.postHttpRequest(`/${this.name}/update`, data);

      return this.prepareItemPayload(payload);
    } catch (error) {
      console.error(error);
    }
  }
}

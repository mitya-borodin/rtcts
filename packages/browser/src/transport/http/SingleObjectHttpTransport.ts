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
> extends BaseHttpTransport<WS, PUB_SUB> {
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
    super(name, ws, channelName, ACL, pubSub, root);

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

      if (!payload) {
        return;
      }

      const response = new Response<ENTITY>(payload);

      return new Response<ENTITY>({
        payload: new this.Entity(response.payload),
        validationResult: response.validationResult,
      });
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

      if (!payload) {
        return;
      }

      const response = new Response<ENTITY>(payload);

      return new Response<ENTITY>({
        payload: new this.Entity(response.payload),
        validationResult: response.validationResult,
      });
    } catch (error) {
      console.error(error);
    }
  }
}
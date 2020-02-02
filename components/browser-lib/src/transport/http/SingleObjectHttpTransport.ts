import { BaseHttpTransport, BaseHttpTransportACL } from "./BaseHttpTransport";
import EventEmitter from "eventemitter3";
import { WSClient } from "../ws/WSClient";
import { Entity, Response } from "@rtcts/isomorphic";

export interface SingleObjectHttpTransportACL extends BaseHttpTransportACL {
  getItem: string[];
  update: string[];
}

export class SingleObjectHttpTransport<
  ENTITY extends Entity<DATA, VA>,
  DATA,
  VA extends any[] = any[],
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

    this.Entity = Entity;

    this.getItem = this.getItem.bind(this);
    this.update = this.update.bind(this);
  }

  public async getItem(): Promise<Response<ENTITY> | void> {
    try {
      if (!this.ACL.getItem.includes(this.currentUserGroup)) {
        return;
      }

      const result: any | void = await this.getHttpRequest(`/${this.name}`);

      if (!result) {
        return;
      }

      const response = new Response(result);

      return new Response<ENTITY>({
        result: new this.Entity(response.result),
        validates: response.validates,
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

      const result: any | void = await this.postHttpRequest(`/${this.name}`, data);

      if (!result) {
        return;
      }

      const response = new Response(result);

      return new Response<ENTITY>({
        result: new this.Entity(response.result),
        validates: response.validates,
      });
    } catch (error) {
      console.error(error);
    }
  }
}

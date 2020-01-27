import { HTTPTransport, HTTPTransportACL } from "./HTTPTransport";
import EventEmitter from "eventemitter3";
import { WSClient } from "../ws/WSClient";
import { Entity, ListResponse, Response } from "@rtcts/isomorphic";

export interface SingletonHTTPTransportACL extends HTTPTransportACL {
  read: string[];
  update: string[];
}

export class SingletonHTTPTransport<
  ENTITY extends Entity<DATA>,
  DATA,
  WS extends WSClient = WSClient,
  PUB_SUB extends EventEmitter = EventEmitter
> extends HTTPTransport<WS, PUB_SUB> {
  protected Entity: new (data: any) => ENTITY;

  public readonly ACL: SingletonHTTPTransportACL;

  constructor(
    name: string,
    Entity: new (data: any) => ENTITY,
    ws: WS,
    channelName: string,
    ACL: SingletonHTTPTransportACL,
    pubSub: PUB_SUB,
    root = "/api",
  ) {
    super(name, ws, channelName, ACL, pubSub, root);

    this.Entity = Entity;

    this.getList = this.getList.bind(this);
    this.update = this.update.bind(this);
  }

  public async getList(): Promise<ListResponse<ENTITY> | void> {
    try {
      if (this.ACL.read.includes(this.currentUserGroup)) {
        const result: any | void = await this.getHttpRequest(`/${this.name}`);

        if (!result) {
          return;
        }

        const listResponse = new ListResponse(result);

        return new ListResponse<ENTITY>({
          count: listResponse.count,
          results: listResponse.results.map((result: any) => {
            const entity = new this.Entity(result);

            entity.isEntity();

            return entity;
          }),
          validates: listResponse.validates,
        });
      }
    } catch (error) {
      console.error(error);
    }
  }

  public async update(data: object): Promise<Response<ENTITY> | void> {
    try {
      if (this.ACL.update.includes(this.currentUserGroup)) {
        const result: any | void = await this.postHttpRequest(`/${this.name}`, data);

        if (!result) {
          return;
        }

        const response = new Response(result);

        return new Response<ENTITY>({
          result: new this.Entity(response.result),
          validates: response.validates,
        });
      }
    } catch (error) {
      console.error(error);
    }
  }
}

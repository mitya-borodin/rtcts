import { Entity, ListResponse, Response } from "@rtcts/isomorphic";
import EventEmitter from "eventemitter3";
import { WSClient } from "../ws/WSClient";
import { HTTPTransport, HTTPTransportACL } from "./HTTPTransport";

export interface RepositoryHTTPTransportACL extends HTTPTransportACL {
  collection: string[];
  read: string[];
  create: string[];
  update: string[];
  remove: string[];
}

export class RepositoryHTTPTransport<
  ENTITY extends Entity<DATA>,
  DATA,
  WS extends WSClient = WSClient,
  PUB_SUB extends EventEmitter = EventEmitter
> extends HTTPTransport<WS, PUB_SUB> {
  protected Entity: new (data: any) => ENTITY;

  public readonly ACL: RepositoryHTTPTransportACL;

  constructor(
    name: string,
    Entity: new (data: any) => ENTITY,
    ws: WS,
    channelName: string,
    ACL: RepositoryHTTPTransportACL,
    pubSub: PUB_SUB,
    root = "/api",
  ) {
    super(name, ws, channelName, ACL, pubSub, root);

    this.Entity = Entity;

    this.getList = this.getList.bind(this);
    this.getItem = this.getItem.bind(this);
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
    this.remove = this.remove.bind(this);
  }

  public async getList(): Promise<ListResponse<ENTITY> | void> {
    try {
      if (this.ACL.collection.includes(this.currentUserGroup)) {
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

  public async getItem(id: string): Promise<Response<ENTITY> | void> {
    try {
      if (this.ACL.read.includes(this.currentUserGroup)) {
        const result: any | void = await this.getHttpRequest(`/${this.name}/${id}`);

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

  public async create(input: object): Promise<Response<ENTITY> | void> {
    try {
      if (this.ACL.create.includes(this.currentUserGroup)) {
        const result: any | void = await this.putHttpRequest(`/${this.name}`, input);

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

  public async update(input: object): Promise<Response<ENTITY> | void> {
    try {
      if (this.ACL.update.includes(this.currentUserGroup)) {
        const result: any | void = await this.postHttpRequest(`/${this.name}`, input);

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

  public async remove(id: string): Promise<Response<ENTITY> | void> {
    try {
      if (this.ACL.remove.includes(this.currentUserGroup)) {
        const result: any | void = await this.deleteHttpRequest(`/${this.name}`, { id });

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

/* eslint-disable no-unused-vars */
import { ListResponse, Response, User } from "@rtcts/isomorphic";
import EventEmitter from "eventemitter3";
import {
  RepositoryHttpTransport,
  RepositoryHttpTransportACL,
} from "../transport/http/RepositoryHttpTransport";
import { WSClient } from "../transport/ws/WSClient";

interface UserHTTPTransportACL extends RepositoryHttpTransportACL {
  updateLogin: string[];
  updatePassword: string[];
  updateGroup: string[];
}

export class UserHTTPTransport<
  ENTITY extends User,
  WS extends WSClient = WSClient,
  PUB_SUB extends EventEmitter = EventEmitter
> extends RepositoryHttpTransport<ENTITY, WS, PUB_SUB> {
  public ACL: UserHTTPTransportACL;

  constructor(
    name: string,
    Entity: new (data: any) => ENTITY,
    ws: WS,
    channelName: string,
    ACL: UserHTTPTransportACL,
    pubSub: PUB_SUB,
    root = "/api",
  ) {
    super(name, Entity, ws, channelName, ACL, pubSub, root);

    this.ACL = ACL;
  }

  public async current(): Promise<Response<ENTITY> | void> {
    try {
      const payload: any | void = await this.getHttpRequest(`/${this.name}/current`);

      return this.prepareItemPayload(payload);
    } catch (error) {
      console.error(error);
    }
  }

  public async signIn(data: object): Promise<Response | void> {
    try {
      const payload: any | void = await this.postHttpRequest(`/${this.name}/signIn`, data);

      return this.prepareItemPayload(payload);
    } catch (error) {
      console.error(error);
    }
  }

  public async signUp(data: object): Promise<Response | void> {
    try {
      const payload: any | void = await this.postHttpRequest(`/${this.name}/signUp`, data);

      return this.prepareItemPayload(payload);
    } catch (error) {
      console.error(error);
    }
  }

  public async signOut(): Promise<void> {
    try {
      await this.postHttpRequest(`/${this.name}/signOut`);
    } catch (error) {
      console.error(error);
    }
  }

  public async updateLogin(data: object): Promise<Response<ENTITY> | void> {
    try {
      if (this.ACL.updateLogin.includes(this.currentUserGroup)) {
        const payload: any | void = await this.postHttpRequest(`/${this.name}/updateLogin`, data);

        return this.prepareItemPayload(payload);
      }
    } catch (error) {
      console.error(error);
    }
  }

  public async updatePassword(data: object): Promise<Response<ENTITY> | void> {
    try {
      if (this.ACL.updatePassword.includes(this.currentUserGroup)) {
        const payload: any | void = await this.postHttpRequest(
          `/${this.name}/updatePassword`,
          data,
        );

        return this.prepareItemPayload(payload);
      }
    } catch (error) {
      console.error(error);
    }
  }

  public async updateGroup(ids: string[], group: string): Promise<ListResponse<ENTITY> | void> {
    try {
      if (this.ACL.updateGroup.includes(this.currentUserGroup)) {
        const payload: any | void = await this.postHttpRequest(`/${this.name}/updateGroup`, {
          ids,
          group,
        });

        return this.prepareListPayload(payload);
      }
    } catch (error) {
      console.error(error);
    }
  }
}

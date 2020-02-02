import { ListResponse, Response, User, UserData } from "@rtcts/isomorphic";
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
  ENTITY extends User<DATA, VA>,
  DATA extends UserData = UserData,
  VA extends any[] = any[],
  WS extends WSClient = WSClient,
  PUB_SUB extends EventEmitter = EventEmitter
> extends RepositoryHttpTransport<ENTITY, DATA, VA, WS, PUB_SUB> {
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
  }

  public async current(): Promise<Response<ENTITY> | void> {
    try {
      const result: any | void = await this.getHttpRequest(`/${this.name}/current`);

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

  public async signIn(data: object): Promise<void> {
    try {
      await this.postHttpRequest(`/${this.name}/signIn`, data);
    } catch (error) {
      console.error(error);
    }
  }

  public async signUp(data: object): Promise<void> {
    try {
      await this.postHttpRequest(`/${this.name}/signUp`, data);
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
        const result: any | void = await this.postHttpRequest(`/${this.name}/updateLogin`, data);

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

  public async updatePassword(data: object): Promise<Response<ENTITY> | void> {
    try {
      if (this.ACL.updatePassword.includes(this.currentUserGroup)) {
        const result: any | void = await this.postHttpRequest(`/${this.name}/updatePassword`, data);

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

  public async updateGroup(ids: string[], group: string): Promise<ListResponse<ENTITY> | void> {
    try {
      if (this.ACL.updateGroup.includes(this.currentUserGroup)) {
        const result: any | void = await this.postHttpRequest(`/${this.name}/updateGroup`, {
          ids,
          group,
        });

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
}

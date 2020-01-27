import { userEventEnum } from "@rtcts/isomorphic";
import { isString } from "@rtcts/utils";
import EventEmitter from "eventemitter3";
import { WSClient } from "../ws/WSClient";

export interface HTTPTransportACL {
  subscribeToChannel: string[];
  unsubscribeFromChannel: string[];
}

export class HTTPTransport<
  WS extends WSClient = WSClient,
  PUB_SUB extends EventEmitter = EventEmitter
> {
  public currentUserGroup: string;

  protected name: string;
  protected ws: WS;
  protected channelName: string;
  public readonly ACL: HTTPTransportACL;
  protected pubSub: PUB_SUB;
  protected rootPath: string;

  constructor(
    name: string,
    ws: WS,
    channelName: string,
    ACL: HTTPTransportACL,
    pubSub: PUB_SUB,
    rootPath = "/api",
  ) {
    this.name = name.toLocaleLowerCase();
    this.ws = ws;
    this.channelName = channelName;
    this.ACL = ACL;
    this.pubSub = pubSub;
    this.rootPath = rootPath;

    this.pubSub.on(userEventEnum.SET_USER_GROUP, (currentUserGroup: string) => {
      if (isString(currentUserGroup)) {
        this.currentUserGroup = currentUserGroup;
      }
    });

    this.pubSub.on(userEventEnum.CLEAR_USER_GROUP, () => {
      this.currentUserGroup = "";
    });

    this.subscribeToChannel = this.subscribeToChannel.bind(this);
    this.unsubscribeFromChannel = this.unsubscribeFromChannel.bind(this);
    this.getHttpRequest = this.getHttpRequest.bind(this);
    this.postHttpRequest = this.postHttpRequest.bind(this);
    this.putHttpRequest = this.putHttpRequest.bind(this);
    this.deleteHttpRequest = this.deleteHttpRequest.bind(this);
    this.makeHttpRequest = this.makeHttpRequest.bind(this);
  }

  public async subscribeToChannel(): Promise<void> {
    try {
      if (this.ACL.subscribeToChannel.includes(this.currentUserGroup)) {
        await this.postHttpRequest(`/${this.name}/channel`, {
          channelName: this.channelName,
          action: "on",
        });
      }
    } catch (error) {
      console.error(error);
    }
  }

  public async unsubscribeFromChannel(): Promise<void> {
    try {
      if (this.ACL.unsubscribeFromChannel.includes(this.currentUserGroup)) {
        await this.postHttpRequest(`/${this.name}/channel`, {
          channelName: this.channelName,
          action: "off",
        });
      }
    } catch (error) {
      console.error(error);
    }
  }

  protected async getHttpRequest(path: string, options = {}): Promise<any | void> {
    return await this.makeHttpRequest(path, "GET", options);
  }

  protected async postHttpRequest(path: string, options = {}, body?: object): Promise<any | void> {
    return await this.makeHttpRequest(path, "POST", options, body);
  }

  protected async putHttpRequest(path: string, options = {}, body?: object): Promise<any | void> {
    return await this.makeHttpRequest(path, "PUT", options, body);
  }

  protected async deleteHttpRequest(
    path: string,
    options = {},
    body?: object,
  ): Promise<any | void> {
    return await this.makeHttpRequest(path, "DELETE", options, body);
  }

  private async makeHttpRequest(
    path = "",
    method = "GET",
    options = {},
    body = {},
  ): Promise<any | void> {
    try {
      const res = await fetch(
        this.rootPath + path,
        Object.assign(
          {
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              "x-ws-id": this.ws.wsid,
            },
            method,
          },
          method === "GET" ? {} : { body: JSON.stringify(body) },
          options,
        ),
      );

      if (res.status === 200) {
        return await res.json();
      } else if (res.status === 404) {
        console.info(`[ ${this.constructor.name} ][ path: ${this.rootPath + path} ][ NOT_FOUND ]`);
      } else {
        console.error({
          status: res.status,
          statusText: res.statusText,
        });
      }
    } catch (error) {
      console.error(error);
    }
  }
}

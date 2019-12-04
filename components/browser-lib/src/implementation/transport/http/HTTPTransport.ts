import { userRepositoryEventEnum } from "@borodindmitriy/interfaces";
import { Mediator } from "@borodindmitriy/isomorphic";
import { isString } from "@borodindmitriy/utils";
import { IHTTPTransport } from "../../../interfaces/transport/http/IHTTPTransport";
import { IWSClient } from "../../../interfaces/transport/ws/IWSClient";

export class HTTPTransport<T, WS extends IWSClient = IWSClient, ME extends Mediator = Mediator>
  implements IHTTPTransport {
  public readonly ACL: {
    onChannel: string[];
    offChannel: string[];
  };
  public group: string;

  protected name: string;
  protected Class: new (data?: any) => T;
  protected ws: WS;
  protected root: string;
  protected channelName: string;
  protected mediator: ME;

  constructor(
    name: string,
    Class: new (data?: any) => T,
    ws: WS,
    channelName: string,
    ACL: {
      onChannel: string[];
      offChannel: string[];
    },
    mediator: ME,
    root = "/api",
  ) {
    // * DEPS
    this.name = name.toLocaleLowerCase();
    this.Class = Class;
    this.ws = ws;
    this.channelName = channelName;
    this.root = root;
    this.ACL = ACL;
    this.mediator = mediator;

    // ! SUBSCRIPTIONS
    this.mediator.on(userRepositoryEventEnum.SET_USER_GROUP, (group: string) => {
      if (isString(group)) {
        this.group = group;
      }
    });

    this.mediator.on(userRepositoryEventEnum.CLEAR_USER_GROUP, () => {
      this.group = "";
    });

    // * BINDINGS
    this.onChannel = this.onChannel.bind(this);
    this.offChannel = this.offChannel.bind(this);
    this.get = this.get.bind(this);
    this.post = this.post.bind(this);
    this.put = this.put.bind(this);
    this.del = this.del.bind(this);
    this.fetch = this.fetch.bind(this);
  }

  public async onChannel(): Promise<void> {
    try {
      if (this.ACL.onChannel.includes(this.group)) {
        await this.post(`/${this.name}/channel`, { channelName: this.channelName, action: "on" });
      }
    } catch (error) {
      console.error(error);
    }
  }

  public async offChannel(): Promise<void> {
    try {
      if (this.ACL.offChannel.includes(this.group)) {
        await this.post(`/${this.name}/channel`, { channelName: this.channelName, action: "off" });
      }
    } catch (error) {
      console.error(error);
    }
  }

  protected async get(URL: string): Promise<any | void> {
    return await this.fetch(URL, "GET");
  }

  protected async post(URL: string, body?: object): Promise<any | void> {
    return await this.fetch(URL, "POST", body);
  }

  protected async put(URL: string, body?: object): Promise<any | void> {
    return await this.fetch(URL, "PUT", body);
  }

  protected async del(URL: string, body?: object): Promise<any | void> {
    return await this.fetch(URL, "DELETE", body);
  }

  private async fetch(URL = "", method = "POST", body = {}): Promise<any | void> {
    try {
      const res = await fetch(
        this.root + URL,
        Object.assign(
          {
            headers: {
              // tslint:disable-next-line:object-literal-key-quotes
              Accept: "application/json",
              // tslint:disable-next-line:object-literal-key-quotes
              Authorization: `bearer ${localStorage.getItem("token")}`,
              "Content-Type": "application/json",
              ["x-ws-id"]: this.ws.wsid,
            },
            method,
          },
          method === "GET" ? {} : { body: JSON.stringify(body) },
        ),
      );

      if (res.status === 200) {
        return await res.json();
      } else if (res.status === 404) {
        console.info(`[ ${this.constructor.name} ][ URL: ${this.root + URL} ][ NOT_FOUND ]`);
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

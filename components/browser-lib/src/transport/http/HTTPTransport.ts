import { WSClient } from "../ws/WSClient";

export class HTTPTransport<T, WS extends WSClient = WSClient, ME extends Mediator = Mediator> {
  public readonly ACL: {
    subscribeToChannel: string[];
    unsubscribeFromChannel: string[];
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
      subscribeToChannel: string[];
      unsubscribeFromChannel: string[];
    },
    mediator: ME,
    root = "/api",
  ) {
    this.name = name.toLocaleLowerCase();
    this.Class = Class;
    this.ws = ws;
    this.channelName = channelName;
    this.root = root;
    this.ACL = ACL;
    this.mediator = mediator;

    this.mediator.on(userRepositoryEventEnum.SET_USER_GROUP, (group: string) => {
      if (isString(group)) {
        this.group = group;
      }
    });

    this.mediator.on(userRepositoryEventEnum.CLEAR_USER_GROUP, () => {
      this.group = "";
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
      if (this.ACL.subscribeToChannel.includes(this.group)) {
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
      if (this.ACL.unsubscribeFromChannel.includes(this.group)) {
        await this.postHttpRequest(`/${this.name}/channel`, {
          channelName: this.channelName,
          action: "off",
        });
      }
    } catch (error) {
      console.error(error);
    }
  }

  protected async getHttpRequest(path: string): Promise<any | void> {
    return await this.makeHttpRequest(path, "GET");
  }

  protected async postHttpRequest(path: string, body?: object): Promise<any | void> {
    return await this.makeHttpRequest(path, "POST", body);
  }

  protected async putHttpRequest(path: string, body?: object): Promise<any | void> {
    return await this.makeHttpRequest(path, "PUT", body);
  }

  protected async deleteHttpRequest(path: string, body?: object): Promise<any | void> {
    return await this.makeHttpRequest(path, "DELETE", body);
  }

  private async makeHttpRequest(path = "", method = "GET", body = {}): Promise<any | void> {
    try {
      const res = await fetch(
        this.root + path,
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
        ),
      );

      if (res.status === 200) {
        return await res.json();
      } else if (res.status === 404) {
        console.info(`[ ${this.constructor.name} ][ path: ${this.root + path} ][ NOT_FOUND ]`);
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

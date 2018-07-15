import { userRepositoryEventEnum } from "../enums/userRepositoryEventEnum";
import { isString } from "../utils/isType";
import { IMediator } from "./interfaces/IMediator";
import { IService } from "./interfaces/IService";
import { IWSClient } from "./interfaces/IWSClient";

export class Service<T> implements IService<T> {
  protected name: string;
  protected Class: { new (data?: any): T };
  protected ws: IWSClient;
  protected root: string;
  protected channelName: string;
  protected group: string;
  protected ACL: {
    collection: string[];
    model: string[];
    create: string[];
    remove: string[];
    update: string[];
    onChannel: string[];
    offChannel: string[];
  };
  protected mediator: IMediator;

  constructor(
    name: string,
    Class: { new (data?: any): T },
    ws: IWSClient,
    channelName: string,
    ACL: {
      collection: string[];
      model: string[];
      create: string[];
      remove: string[];
      update: string[];
      onChannel: string[];
      offChannel: string[];
    },
    mediator: IMediator,
    root = "/service",
  ) {
    // DEPS
    this.name = name.toLocaleLowerCase();
    this.Class = Class;
    this.ws = ws;
    this.channelName = channelName;
    this.root = root;
    this.ACL = ACL;
    this.mediator = mediator;

    // BINDINGS
    this.collection = this.collection.bind(this);
    this.model = this.model.bind(this);
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
    this.remove = this.remove.bind(this);
    this.onChannel = this.onChannel.bind(this);
    this.offChannel = this.offChannel.bind(this);
    this.get = this.get.bind(this);
    this.post = this.post.bind(this);
    this.put = this.put.bind(this);
    this.del = this.del.bind(this);
    this.fetch = this.fetch.bind(this);

    // SUBSCRIPTIONS
    this.mediator.on(userRepositoryEventEnum.SET_USER_GROUP, (group: string) => {
      if (isString(group)) {
        this.group = group;
      }
    });

    this.mediator.on(userRepositoryEventEnum.CLEAR_USER_GROUP, () => {
      this.group = "";
    });
  }

  public async collection(): Promise<T[] | void> {
    if (this.ACL.collection.includes(this.group)) {
      const output: object[] | void = await this.get(`/${this.name}/collection`);

      if (output) {
        return output.map((item) => new this.Class(item));
      }
    }
  }

  public async model(id: string): Promise<T | void> {
    if (this.ACL.model.includes(this.group)) {
      const output: object | void = await this.get(`/${this.name}/model?id=${id}`);

      if (output) {
        return new this.Class(output);
      }
    }
  }

  public async create(input: object): Promise<T | void> {
    if (this.ACL.create.includes(this.group)) {
      const output: object | void = await this.put(`/${this.name}/create`, input);

      if (output) {
        return new this.Class(output);
      }
    }
  }

  public async update(input: object): Promise<T | void> {
    if (this.ACL.update.includes(this.group)) {
      const output: object | void = await this.post(`/${this.name}/update`, input);

      if (output) {
        return new this.Class(output);
      }
    }
  }

  public async remove(id: string): Promise<T | void> {
    if (this.ACL.remove.includes(this.group)) {
      const output: object | void = await this.del(`/${this.name}/remove`, { id });

      if (output) {
        return new this.Class(output);
      }
    }
  }

  public async onChannel(): Promise<void> {
    if (this.ACL.onChannel.includes(this.group)) {
      await this.post(`/${this.name}/channel`, { channelName: this.channelName, action: "on" });
    }
  }

  public async offChannel(): Promise<void> {
    if (this.ACL.offChannel.includes(this.group)) {
      await this.post(`/${this.name}/channel`, { channelName: this.channelName, action: "off" });
    }
  }

  protected async get(URL: string) {
    return await this.fetch(URL, "GET");
  }

  protected async post(URL: string, body?: object) {
    return await this.fetch(URL, "POST", body);
  }

  protected async put(URL: string, body?: object) {
    return await this.fetch(URL, "PUT", body);
  }

  protected async del(URL: string, body?: object) {
    return await this.fetch(URL, "DELETE", body);
  }

  private fetch(URL = "", method = "POST", body = {}): Promise<any | void> {
    return new Promise((resolve, reject) => {
      fetch(
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
      )
        .then((res: any) => {
          if (res.status === 200) {
            return res.json().then(resolve);
          } else {
            console.error({
              status: res.status,
              statusText: res.statusText,
            });

            resolve();
          }
        })
        .catch((error) => {
          console.error(error);
          reject(error);
        });
    });
  }
}

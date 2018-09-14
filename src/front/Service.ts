import { userRepositoryEventEnum } from "../enums/userRepositoryEventEnum";
import { isString } from "../utils/isType";
import { IMediator } from "./interfaces/IMediator";
import { IService } from "./interfaces/IService";
import { IWSClient } from "./interfaces/IWSClient";

export class Service<T, WS extends IWSClient = IWSClient, ME extends IMediator = IMediator> implements IService<T> {
  public readonly ACL: {
    collection: string[];
    model: string[];
    create: string[];
    remove: string[];
    update: string[];
    onChannel: string[];
    offChannel: string[];
  };
  public group: string;

  protected name: string;
  protected Class: { new (data?: any): T };
  protected ws: WS;
  protected root: string;
  protected channelName: string;
  protected mediator: ME;

  constructor(
    name: string,
    Class: { new (data?: any): T },
    ws: WS,
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
    mediator: ME,
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

    // SUBSCRIPTIONS
    this.mediator.on(userRepositoryEventEnum.SET_USER_GROUP, (group: string) => {
      if (isString(group)) {
        this.group = group;
      }
    });

    this.mediator.on(userRepositoryEventEnum.CLEAR_USER_GROUP, () => {
      this.group = "";
    });

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
  }

  public async collection(): Promise<T[] | void> {
    try {
      if (this.ACL.collection.includes(this.group)) {
        const output: object[] | void = await this.get(`/${this.name}/collection`);

        if (output) {
          return output.map((item) => new this.Class(item));
        }
      }
    } catch (error) {
      console.error(error);

      return Promise.reject();
    }
  }

  public async model(id: string): Promise<T | void> {
    try {
      if (this.ACL.model.includes(this.group)) {
        const output: object | void = await this.get(`/${this.name}/model?id=${id}`);

        if (output) {
          return new this.Class(output);
        }
      }
    } catch (error) {
      console.error(error);

      return Promise.reject();
    }
  }

  public async create(input: object): Promise<T | void> {
    try {
      if (this.ACL.create.includes(this.group)) {
        const output: object | void = await this.put(`/${this.name}/create`, input);

        if (output) {
          return new this.Class(output);
        }
      }
    } catch (error) {
      console.error(error);

      return Promise.reject();
    }
  }

  public async update(input: object): Promise<T | void> {
    try {
      if (this.ACL.update.includes(this.group)) {
        const output: object | void = await this.post(`/${this.name}/update`, input);

        if (output) {
          return new this.Class(output);
        }
      }
    } catch (error) {
      console.error(error);

      return Promise.reject();
    }
  }

  public async remove(id: string): Promise<T | void> {
    try {
      if (this.ACL.remove.includes(this.group)) {
        const output: object | void = await this.del(`/${this.name}/remove`, { id });

        if (output) {
          return new this.Class(output);
        }
      }
    } catch (error) {
      console.error(error);

      return Promise.reject();
    }
  }

  public async onChannel(): Promise<void> {
    try {
      if (this.ACL.onChannel.includes(this.group)) {
        await this.post(`/${this.name}/channel`, { channelName: this.channelName, action: "on" });
      }
    } catch (error) {
      console.error(error);

      return Promise.reject();
    }
  }

  public async offChannel(): Promise<void> {
    try {
      if (this.ACL.offChannel.includes(this.group)) {
        await this.post(`/${this.name}/channel`, { channelName: this.channelName, action: "off" });
      }
    } catch (error) {
      console.error(error);

      return Promise.reject();
    }
  }

  protected async get(URL: string) {
    try {
      return await this.fetch(URL, "GET");
    } catch (error) {
      console.error(error);

      return Promise.reject();
    }
  }

  protected async post(URL: string, body?: object) {
    try {
      return await this.fetch(URL, "POST", body);
    } catch (error) {
      console.error(error);

      return Promise.reject();
    }
  }

  protected async put(URL: string, body?: object) {
    try {
      return await this.fetch(URL, "PUT", body);
    } catch (error) {
      console.error(error);

      return Promise.reject();
    }
  }

  protected async del(URL: string, body?: object) {
    try {
      return await this.fetch(URL, "DELETE", body);
    } catch (error) {
      console.error(error);

      return Promise.reject();
    }
  }

  private fetch(URL = "", method = "POST", body = {}): Promise<any | void> {
    return new Promise((resolve, reject) => {
      try {
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

            reject();
          });
      } catch (error) {
        console.error(error);

        return reject();
      }
    });
  }
}

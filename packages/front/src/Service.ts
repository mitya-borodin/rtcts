import { IMediator } from "@borodindmitriy/isomorphic";
import { BaseService } from "./BaseService";
import { IService } from "./interfaces/IService";
import { IWSClient } from "./interfaces/IWSClient";

export class Service<T, WS extends IWSClient = IWSClient, ME extends IMediator = IMediator>
  extends BaseService<T, WS, ME>
  implements IService<T> {
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
    super(name, Class, ws, channelName, ACL, mediator, root);

    // BINDINGS
    this.collection = this.collection.bind(this);
    this.model = this.model.bind(this);
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
    this.remove = this.remove.bind(this);
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
    }
  }
}

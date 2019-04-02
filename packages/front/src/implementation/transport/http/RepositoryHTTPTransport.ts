import { IMediator } from "@borodindmitriy/isomorphic";
import { IRepositoryHTTPTransport } from "../../../interfaces/transport/http/IRepositoryHTTPTransport";
import { IWSClient } from "../../../interfaces/transport/ws/IWSClient";
import { HTTPTransport } from "./HTTPTransport";

export class RepositoryHTTPTransport<T, WS extends IWSClient = IWSClient, ME extends IMediator = IMediator>
  extends HTTPTransport<T, WS, ME>
  implements IRepositoryHTTPTransport<T> {
  public readonly ACL: {
    collection: string[];
    read: string[];
    create: string[];
    update: string[];
    remove: string[];
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
      read: string[];
      create: string[];
      update: string[];
      remove: string[];
      onChannel: string[];
      offChannel: string[];
    },
    mediator: ME,
    root,
  ) {
    super(name, Class, ws, channelName, ACL, mediator, root);

    // BINDINGS
    this.collection = this.collection.bind(this);
    this.read = this.read.bind(this);
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

  public async read(id: string): Promise<T | void> {
    try {
      if (this.ACL.read.includes(this.group)) {
        const output: object | void = await this.get(`/${this.name}/read?id=${id}`);

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

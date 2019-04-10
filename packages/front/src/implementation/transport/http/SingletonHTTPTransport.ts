import { IMediator } from "@borodindmitriy/isomorphic";
import { ISingletonHTTPTransport } from "../../../interfaces/transport/http/ISingletonHTTPTransport";
import { IWSClient } from "../../../interfaces/transport/ws/IWSClient";
import { HTTPTransport } from "./HTTPTransport";

export class SingletonHTTPTransport<T, WS extends IWSClient = IWSClient, ME extends IMediator = IMediator>
  extends HTTPTransport<T, WS, ME>
  implements ISingletonHTTPTransport<T> {
  public readonly ACL: {
    read: string[];
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
      read: string[];
      update: string[];
      onChannel: string[];
      offChannel: string[];
    },
    mediator: ME,
    root = "/api",
  ) {
    super(name, Class, ws, channelName, ACL, mediator, root);

    // BINDINGS
    this.read = this.read.bind(this);
    this.update = this.update.bind(this);
  }

  public async read(): Promise<T | void> {
    try {
      if (this.ACL.read.includes(this.group)) {
        const output: object | void = await this.get(`/${this.name}/read`);

        if (output) {
          return new this.Class(output);
        }
      }
    } catch (error) {
      console.error(error);
    }
  }

  public async update(data: object): Promise<T | void> {
    try {
      if (this.ACL.update.includes(this.group)) {
        const output: object | void = await this.post(`/${this.name}/update`, data);

        if (output) {
          return new this.Class(output);
        }
      }
    } catch (error) {
      console.error(error);
    }
  }
}

import { IMediator } from "@borodindmitriy/isomorphic";
import { BaseService } from "./BaseService";
import { ICommonService } from "./interfaces/ICommonService";
import { IWSClient } from "./interfaces/IWSClient";

export class CommonService<T, WS extends IWSClient = IWSClient, ME extends IMediator = IMediator>
  extends BaseService<T, WS, ME>
  implements ICommonService<T> {
  public readonly ACL: {
    model: string[];
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
      model: string[];
      update: string[];
      onChannel: string[];
      offChannel: string[];
    },
    mediator: ME,
    root = "/service",
  ) {
    super(name, Class, ws, channelName, ACL, mediator, root);

    // BINDINGS
    this.model = this.model.bind(this);
    this.update = this.update.bind(this);
  }

  public async model(): Promise<T | void> {
    try {
      if (this.ACL.model.includes(this.group)) {
        const output: object | void = await this.get(`/${this.name}/model`);

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

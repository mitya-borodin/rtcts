import { IPersist } from "../interfaces/IPersist";
import { IUser } from "../interfaces/IUser";
import { IMediator } from "./interfaces/IMediator";
import { IUserService } from "./interfaces/IUserService";
import { IWSClient } from "./interfaces/IWSClient";
import { Service } from "./Service";

export class UserService<U extends IUser & IPersist, WS extends IWSClient = IWSClient, ME extends IMediator = IMediator>
  extends Service<U, WS>
  implements IUserService<U> {
  protected ACL: {
    collection: string[];
    model: string[];
    create: string[];
    remove: string[];
    update: string[];
    onChannel: string[];
    offChannel: string[];
    current: string[];
    updateLogin: string[];
    updatePassword: string[];
    updateGroup: string[];
  };

  constructor(
    name: string,
    Class: { new (data?: any): U },
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
      updateLogin: string[];
      updatePassword: string[];
      updateGroup: string[];
    },
    mediator: ME,
    root = "/service",
  ) {
    super(name, Class, ws, channelName, ACL, mediator, root);
  }

  public async current(): Promise<U | void> {
    const output: object | void = await this.get(`/${this.name}/current`);

    if (output) {
      return new this.Class(output);
    }
  }

  public async signIn(data: object): Promise<string | void> {
    const output: string | null = await this.post(`/${this.name}/signIn`, data);

    if (output) {
      return output;
    }
  }

  public async signUp(data: object): Promise<{ token: string; user: object } | void> {
    const output: { token: string; user: object } | void = await this.post(`/${this.name}/signUp`, data);

    if (output) {
      return output;
    }
  }

  public async updateLogin(data: object): Promise<U | void> {
    if (this.ACL.updateLogin.includes(this.group)) {
      const output: object | void = await this.post(`/${this.name}/updateLogin`, data);

      if (output) {
        return new this.Class(output);
      }
    }
  }

  public async updatePassword(data: object): Promise<U | void> {
    if (this.ACL.updatePassword.includes(this.group)) {
      const output: object | void = await this.post(`/${this.name}/updatePassword`, data);

      if (output) {
        return new this.Class(output);
      }
    }
  }

  public async updateGroup(ids: string[], group: string): Promise<U[] | void> {
    if (this.ACL.updateGroup.includes(this.group)) {
      const output: object[] | void = await this.post(`/${this.name}/updateGroup`, { ids, group });

      if (output) {
        return output.map((item) => new this.Class(item));
      }
    }
  }
}

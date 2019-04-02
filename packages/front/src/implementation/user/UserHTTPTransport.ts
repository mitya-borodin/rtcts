import { IEntity, IUser } from "@borodindmitriy/interfaces";
import { IMediator } from "@borodindmitriy/isomorphic";
import { IWSClient } from "../../interfaces/transport/ws/IWSClient";
import { IUserHTTPTransport } from "../../interfaces/user/IUserHTTPTransport";
import { RepositoryHTTPTransport } from "../transport/http/RepositoryHTTPTransport";

export class UserHTTPTransport<
  U extends IUser & IEntity,
  WS extends IWSClient = IWSClient,
  ME extends IMediator = IMediator
> extends RepositoryHTTPTransport<U, WS> implements IUserHTTPTransport<U> {
  public ACL: {
    collection: string[];
    current: string[];
    read: string[];
    create: string[];
    update: string[];
    remove: string[];
    onChannel: string[];
    offChannel: string[];
    updateLogin: string[];
    updatePassword: string[];
    updateGroup: string[];
  };

  constructor(
    name: string,
    Class: new (data?: any) => U,
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
    try {
      const output: object | void = await this.get(`/${this.name}/current`);

      if (output) {
        return new this.Class(output);
      }
    } catch (error) {
      console.error(error);

      return Promise.reject();
    }
  }

  public async signIn(data: object): Promise<string | void> {
    try {
      const output: string | null = await this.post(`/${this.name}/signIn`, data);

      if (output) {
        return output;
      }
    } catch (error) {
      console.error(error);

      return Promise.reject();
    }
  }

  public async signUp(data: object): Promise<{ token: string; user: object } | void> {
    try {
      const output: { token: string; user: object } | void = await this.post(`/${this.name}/signUp`, data);

      if (output) {
        return output;
      }
    } catch (error) {
      console.error(error);

      return Promise.reject();
    }
  }

  public async updateLogin(data: object): Promise<U | void> {
    try {
      if (this.ACL.updateLogin.includes(this.group)) {
        const output: object | void = await this.post(`/${this.name}/updateLogin`, data);

        if (output) {
          return new this.Class(output);
        }
      }
    } catch (error) {
      console.error(error);

      return Promise.reject();
    }
  }

  public async updatePassword(data: object): Promise<U | void> {
    try {
      if (this.ACL.updatePassword.includes(this.group)) {
        const output: object | void = await this.post(`/${this.name}/updatePassword`, data);

        if (output) {
          return new this.Class(output);
        }
      }
    } catch (error) {
      console.error(error);

      return Promise.reject();
    }
  }

  public async updateGroup(ids: string[], group: string): Promise<U[] | void> {
    try {
      if (this.ACL.updateGroup.includes(this.group)) {
        const output: object[] | void = await this.post(`/${this.name}/updateGroup`, { ids, group });

        if (output) {
          return output.map((item) => new this.Class(item));
        }
      }
    } catch (error) {
      console.error(error);

      return Promise.reject();
    }
  }
}

import { IClientUserService } from "../interfaces/IClientUserService";
import { IPersist } from "../interfaces/IPersist";
import { IUser } from "../interfaces/IUser";
import { IUserGroup } from "../interfaces/IUserGroup";
import { Service } from "./Service";

export class UserService<U extends IUser<G>, G extends IUserGroup> extends Service<U & IPersist>
  implements IClientUserService<U & IPersist, G> {
  public async signIn(login: string, password: string): Promise<string | void> {
    const output: string | null = await this.post(`/${this.name}/signIn`, { login, password });

    if (output) {
      return output;
    }
  }

  public async signUp(
    login: string,
    group: string,
    password: string,
    password_confirm: string,
  ): Promise<string | void> {
    const output: string | void = await this.post(`/${this.name}/signIn`, { login, group, password, password_confirm });

    if (output) {
      return output;
    }
  }

  public async load(token: string): Promise<U & IPersist | void> {
    localStorage.setItem("token", token);

    const output: object | void = await this.get(`/${this.name}/current`);

    if (output) {
      return new this.Class(output);
    }
  }

  public async updateLogin(id: string, login: string): Promise<U & IPersist | void> {
    const output: object | void = await this.post(`/${this.name}/updateLogin`, { login, id });

    if (output) {
      return new this.Class(output);
    }
  }

  public async updatePassword(id: string, password: string, password_confirm: string): Promise<U & IPersist | void> {
    const output: object | void = await this.post(`/${this.name}/updatePassword`, { id, password, password_confirm });

    if (output) {
      return new this.Class(output);
    }
  }

  public async updateGroup(ids: string[], group: string): Promise<Array<U & IPersist> | void> {
    const output: object[] | void = await this.post(`/${this.name}/updateGroup`, { ids, group });

    if (output) {
      return output.map((item) => new this.Class(item));
    }
  }
}

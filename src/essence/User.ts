import { IPersist } from "../interfaces/IPersist";
import { IUser } from "../interfaces/IUser";
import { IUserGroup } from "../interfaces/IUserGroup";
import { detectID } from "../utils/detectID";
import { UserInsert } from "./UserInsert";

export class User<G extends IUserGroup> extends UserInsert<G> implements IUser<G>, IPersist {
  public readonly id: string;

  constructor(data?: any) {
    super(data);

    this.id = detectID(data);
  }

  public toJS(): { [key: string]: any } {
    return {
      ...super.toJS(),
      id: this.id,
    };
  }
}

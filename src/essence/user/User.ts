import { IUser } from "../../interfaces/essence/IUser";
import { IPersist } from "../../interfaces/IPersist";
import { detectID } from "../../utils/detectID";
import { UserInsert } from "./UserInsert";

export class User extends UserInsert implements IUser, IPersist {
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

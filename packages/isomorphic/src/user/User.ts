import { IPersist, IUser } from "@borodindmitriy/interfaces";
import { detectID } from "@borodindmitriy/utils";
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

  public toJSSecure(): { [key: string]: any } {
    return {
      ...super.toJSSecure(),
      id: this.id,
    };
  }
}

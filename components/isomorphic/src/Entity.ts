import { ValidateResult } from "./validate/ValidateResult";
import { isString } from "@borodindmitriy/utils";

export abstract class SimpleObject<Data> {
  public abstract toObject(): Data;
  public toJSON(): Data {
    return this.toObject();
  }
}

export abstract class ValueObject<Data, VA extends any[] = any[]> extends SimpleObject<Data> {
  public abstract canBeInsert(): this is Required<Data>;
  public abstract validate(...args: VA): Promise<ValidateResult>;
}

export type EntityID = { id?: string };

export abstract class Entity<Data, VA extends any[] = any[]> extends ValueObject<Data, VA> {
  readonly id?: string;

  constructor(data: Data & EntityID) {
    super();

    if (data) {
      if (isString(data.id)) {
        this.id = data.id;
      }
    } else {
      throw new Error(`Entity(data) data should be defined`);
    }
  }

  public isEntity(): this is Required<Data & EntityID> {
    if (!isString(this.id)) {
      throw new Error(`${this.constructor.name}.id should be String`);
    }

    this.canBeInsert();

    return true;
  }

  public toObject(): Data & EntityID {
    return {
      ...(isString(this.id) ? { id: this.id } : {}),
      ...this.eject(),
    };
  }

  protected abstract eject(): Data;
}

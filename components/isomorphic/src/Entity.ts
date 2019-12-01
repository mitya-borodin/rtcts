import { ValidateResult } from "./validate/ValidateResult";
import { isString } from "@borodindmitriy/utils";

export interface ValueObject<Data> {
  toObject(): Data;
  toJSON(): object;
}

export type EntityID = { id?: string };

export abstract class Entity<Data, VA extends any[] = any[]> implements ValueObject<Data> {
  readonly id?: string;

  constructor(data: Data & EntityID) {
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

  public abstract canBeInsert(): this is Required<Data>;
  public abstract validate(...args: VA): Promise<ValidateResult>;
  public toObject(): Data & EntityID {
    return {
      ...(isString(this.id) ? { id: this.id } : {}),
      ...this.eject(),
    };
  }

  protected abstract eject(): Data;

  public toJSON(): object {
    return this.toObject();
  }
}

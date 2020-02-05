import { ValidateResult } from "./validate/ValidateResult";
import { isString } from "@rtcts/utils";

export abstract class SimpleObject<DATA> {
  public abstract toObject(): DATA;

  public toJSON(): DATA {
    return this.toObject();
  }

  public toJS(): DATA {
    return this.toObject();
  }
}

export abstract class ValueObject<DATA, VA extends object = object> extends SimpleObject<DATA> {
  public abstract canBeInsert<T = DATA>(): this is Required<T>;
  public abstract validate<T = VA>(options?: T): ValidateResult;
}

export type EntityID = { id?: string };

export abstract class Entity<DATA, VA extends object = object> extends ValueObject<DATA, VA> {
  readonly id?: string;

  constructor(data: Partial<EntityID> & Partial<DATA>) {
    super();

    if (data) {
      if (isString(data.id)) {
        this.id = data.id;
      }
    } else {
      throw new Error(`Entity(data) data should be defined`);
    }
  }

  public isEntity<T = DATA>(): this is Required<EntityID> & Required<T> {
    if (!isString(this.id)) {
      throw new Error(`${this.constructor.name}.id should be String`);
    }

    this.canBeInsert<T>();

    return true;
  }

  public toObject(): EntityID & DATA {
    return {
      ...(isString(this.id) ? { id: this.id } : {}),
      ...this.eject(),
    };
  }

  // ! The eject method returns an object as DATA with allFields that are the current object's content
  protected abstract eject(): DATA;
}

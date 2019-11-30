import { ValidateResult } from "./validate/ValidateResult";
import { isString } from "@borodindmitriy/utils";

export interface ValueObject<Data> {
  toObject(): Data;
  toJSON(): Data;
}

export interface Form<Data extends { id?: string }, VR extends ValidateResult = ValidateResult>
  extends ValueObject<Data> {
  readonly id?: string;

  validate(...args: any[]): Promise<VR>;
}

export abstract class Entity<Data extends { id?: string }> implements ValueObject<Data> {
  readonly id?: string;

  public isEntity(): this is Required<Data> {
    this.isInsert();

    if (!isString(this.id)) {
      throw new Error(`${this.constructor.name}.id should be String`);
    }

    return true;
  }

  public abstract isInsert(): this is Required<Omit<Data, "id">>;
  public abstract toObject(): Data;

  public toJSON(): Data {
    return this.toObject();
  }
}

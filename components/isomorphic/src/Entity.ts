import { ValidateResult } from "./validate/ValidateResult";

export interface ValueObject<Data> {
  toObject(): Data;
  toJSON(): Data;
}

export interface Form<Data extends { id?: string }, VR extends ValidateResult = ValidateResult>
  extends ValueObject<Data> {
  readonly id?: string;

  validate(...args: any[]): Promise<VR>;
}

export interface Entity<Data extends { id?: string }> extends ValueObject<Data> {
  readonly id?: string;

  isEntity(insert?: boolean): this is Required<Data>;
}

export interface ValueObject<Data> {
  toObject(): Data;
  toJSON(): Data;
}

export interface Entity<Data extends { id?: string }> extends ValueObject<Data> {
  readonly id?: string;

  isEntity(insert?: boolean): this is Required<Data>;
}

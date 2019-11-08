import { CollectionInsertOneOptions } from "mongodb";

export interface ICommonModel<P> {
  read(): Promise<P | null>;

  update(
    data: { [key: string]: any },
    uid: string,
    wsid: string,
    options?: CollectionInsertOneOptions,
    excludeCurrentDevice?: boolean,
  ): Promise<P | null>;
}

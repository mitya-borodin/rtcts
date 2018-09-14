import { Moment } from "moment";

export interface IMigration {
  name: string;
  version: number;
  date: Moment;

  forward(): Promise<void>;
  rollBack(): Promise<void>;
}

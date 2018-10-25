import { IInsert } from "./IInsert";

export interface IPersist extends IInsert {
  id: string;
}

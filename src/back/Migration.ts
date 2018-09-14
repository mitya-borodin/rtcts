import { Moment } from "moment";
import { IMigration } from "./interfaces/IMigration";

export abstract class Migration implements IMigration {
  public name: string;
  public version: number;
  public date: Moment;

  constructor(settinhs: { name: string; version: number; date: Moment }) {
    this.name = settinhs.name;
    this.version = settinhs.version;
    this.date = settinhs.date;
  }

  public abstract async forward(): Promise<void>;
  public abstract async rollBack(): Promise<void>;
}

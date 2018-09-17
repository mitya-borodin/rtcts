import { ILog } from "../interfaces/ILog";
import { ILogType } from "../interfaces/ILogType";
import { IValidate } from "../interfaces/IValidate";
import { Log } from "./Log";

// tslint:disable-next-line:max-classes-per-file
export class Validate extends Log implements IValidate {
  public readonly field: string;
  public readonly title?: string;

  constructor(data: { field: string; title?: string; type: ILogType; message: string }) {
    super(data);

    this.field = data.field;
    this.title = data.title;
  }

  public get log(): ILog {
    return new Log({ type: this.type, message: this.message });
  }
}

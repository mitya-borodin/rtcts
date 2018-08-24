import { ILog } from "../interfaces/ILog";
import { ILogType } from "../interfaces/ILogType";
import { IValidate, IValidateResult } from "../interfaces/IValidate";
import { Log } from "./Log";

export class ValidateResult<V extends IValidate = IValidate> implements IValidateResult<V> {
  public readonly results: V[];

  constructor(results: V[]) {
    this.results = results;
  }

  get isValid(): boolean {
    return this.results.length === 0;
  }

  get messages(): string[] {
    return this.results.map(({ message }) => message);
  }

  get log(): ILog[] {
    return this.results.map((v) => v.log);
  }

  public getFieldValidation(a_field: string): V | void {
    return this.results.find(({ field }) => a_field === field);
  }

  public hasFieldError(a_field: string): boolean {
    return !!this.getFieldValidation(a_field);
  }
}

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

import { logTypeEnum } from "../enums/logTypeEnum";
import { ILog } from "../interfaces/ILog";
import { IValidate } from "../interfaces/IValidate";
import { IValidateResult } from "../interfaces/IValidateResult";
import { Validate } from "./Validate";

// tslint:disable:object-literal-sort-keys
export class ValidateResult<V extends IValidate = IValidate> implements IValidateResult<V> {
  public readonly results: V[];
  public readonly isValid: boolean;
  public readonly hasError: boolean;
  public readonly hasWarn: boolean;
  public readonly hasLog: boolean;
  public readonly hasInfo: boolean;

  public readonly messages: string[];
  public readonly log: ILog[];

  private readonly __CACHE__: { [key: string]: any } = {};

  constructor(results: V[]) {
    let hasError = false;
    let hasWarn = false;
    let hasLog = false;
    let hasInfo = false;

    const messages: string[] = [];
    const log: ILog[] = [];

    for (const r of results) {
      if (r.type === logTypeEnum.error) {
        hasError = true;
      }

      if (r.type === logTypeEnum.warn) {
        hasWarn = true;
      }

      if (r.type === logTypeEnum.log) {
        hasLog = true;
      }

      if (r.type === logTypeEnum.info) {
        hasInfo = true;
      }

      messages.push(r.message);
      log.push(Object.freeze(r.log));
    }

    Object.defineProperties(this, {
      results: {
        value: results.map((r) => Object.freeze(r)),
      },
      isValid: {
        value: results.length === 0,
      },
      hasError: {
        value: hasError,
      },
      hasWarn: {
        value: hasWarn,
      },
      hasLog: {
        value: hasLog,
      },
      hasInfo: {
        value: hasInfo,
      },
      messages: {
        value: messages,
      },
      log: {
        value: log,
      },
    });
  }

  public getFieldValidation(a_field: string): V | void {
    let result = this.__CACHE__[a_field];

    if (result) {
      return result;
    }

    result = this.results.find(({ field }) => a_field === field);

    this.__CACHE__[a_field] = result;

    return result;
  }

  public getFieldMessage(a_field: string): string {
    const v = this.getFieldValidation(a_field);

    if (v instanceof Validate) {
      return v.message;
    }

    return "";
  }

  public hasFieldError(a_field: string): boolean {
    return !!this.getFieldValidation(a_field);
  }

  public toValidate(): V[] {
    return this.results.map((r) => r);
  }

  public toJS(): { [key: string]: any } {
    return this.results.map((r) => r.toJS());
  }
}

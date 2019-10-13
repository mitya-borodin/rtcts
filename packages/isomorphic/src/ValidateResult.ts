import { ILog, IValidate, IValidateResult, logTypeEnum } from "@borodindmitriy/interfaces";
import { isArray, isObject, isString } from "@borodindmitriy/utils";
import { Validate } from "./Validate";

// tslint:disable:object-literal-sort-keys
export class ValidateResult implements IValidateResult<IValidate> {
  public readonly results: IValidate[];
  public readonly isValid: boolean;
  public readonly hasError: boolean;
  public readonly hasWarn: boolean;
  public readonly hasLog: boolean;
  public readonly hasInfo: boolean;

  public readonly messages: string[];
  public readonly log: ILog[];

  private readonly __CACHE__: { [key: string]: any } = {};

  constructor(
    V: Array<object | IValidate | IValidateResult<IValidate>> | IValidateResult<IValidate>,
  ) {
    this.results = [];
    this.isValid = false;
    this.hasError = false;
    this.hasWarn = false;
    this.hasLog = false;
    this.hasInfo = false;

    this.messages = [];
    this.log = [];

    let hasError = false;
    let hasWarn = false;
    let hasLog = false;
    let hasInfo = false;

    const messages: string[] = [];
    const log: ILog[] = [];
    const results: IValidate[] = [];

    if (isArray(V)) {
      for (const item of V) {
        if (item instanceof Validate) {
          results.push(item);
        } else if (item instanceof ValidateResult) {
          for (const validate_item of item.toValidate()) {
            results.push(validate_item);
          }
        } else if (isObject(item)) {
          results.push(new Validate(item));
        } else {
          throw new Error(
            `[ ${this.constructor.name} ][ ${JSON.stringify(item)} ][ unexpected item ]`,
          );
        }
      }
    } else if (V instanceof ValidateResult) {
      for (const validate_item of V.toValidate()) {
        results.push(validate_item);
      }
    } else {
      throw new Error(`[ ${this.constructor.name} ][ INCORRECT_VALIDATE_OBJECT ]`);
    }

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
        value: !hasError,
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

    Object.freeze(this);
  }

  public getFieldValidation(a_field: string): IValidate | void {
    let result = this.__CACHE__[a_field];

    if (result) {
      return result;
    }

    result = this.results.find(({ field }) => {
      if (isString(field)) {
        return a_field === field;
      }

      if (isArray(field)) {
        return field.includes(a_field);
      }

      return false;
    });

    this.__CACHE__[a_field] = result;

    return result;
  }

  public getFieldTitle(a_field: string): string {
    const v = this.getFieldValidation(a_field);

    if (v instanceof Validate && isString(v.title)) {
      return v.title;
    }

    return "";
  }

  public getFieldMessage(a_field: string): string {
    const v = this.getFieldValidation(a_field);

    if (v instanceof Validate) {
      return v.message;
    }

    return "";
  }

  public getValidateStatus(a_field: string): any {
    const v = this.getFieldValidation(a_field);

    if (v instanceof Validate) {
      if (v.type === logTypeEnum.error) {
        return "error";
      }
      if (v.type === logTypeEnum.warn) {
        return "warning";
      }
    }
  }

  public hasFieldError(a_field: string): boolean {
    const v: IValidate | void = this.getFieldValidation(a_field);

    if (v instanceof Validate) {
      if (v.type === logTypeEnum.error) {
        return true;
      }
    }

    return false;
  }

  public hasFieldWarning(a_field: string): boolean {
    const v: IValidate | void = this.getFieldValidation(a_field);

    if (v instanceof Validate) {
      if (v.type === logTypeEnum.warn) {
        return true;
      }
    }

    return false;
  }

  public hasFieldInfo(a_field: string): boolean {
    const v: IValidate | void = this.getFieldValidation(a_field);

    if (v instanceof Validate) {
      if (v.type === logTypeEnum.info) {
        return true;
      }
    }

    return false;
  }

  public hasFieldLog(a_field: string): boolean {
    const v: IValidate | void = this.getFieldValidation(a_field);

    if (v instanceof Validate) {
      if (v.type === logTypeEnum.log) {
        return true;
      }
    }

    return false;
  }

  public toValidate(): IValidate[] {
    return this.results.map((r) => r);
  }

  public toJS(): Array<{ [key: string]: any }> {
    return this.results.map((r) => r.toJS());
  }
}

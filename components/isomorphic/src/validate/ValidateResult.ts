import { isArray, isString } from "@borodindmitriy/utils";
import { Log } from "../log/Log";
import { logTypeEnum } from "../log/logTypeEnum";
import { Validate } from "./Validate";

export class ValidateResult {
  public readonly results: Validate[];

  public readonly isValid: boolean;

  public readonly hasLog: boolean;
  public readonly hasInfo: boolean;
  public readonly hasSuccess: boolean;
  public readonly hasWarning: boolean;
  public readonly hasError: boolean;
  public readonly hasValidating: boolean;

  public readonly messages: string[];
  public readonly log: Log[];

  private readonly cache: Map<string, any> = new Map();

  constructor(data?: Array<ValidateResult | Validate> | ValidateResult | Validate) {
    this.results = [];

    this.isValid = false;

    this.hasLog = false;
    this.hasInfo = false;
    this.hasSuccess = false;
    this.hasWarning = false;
    this.hasError = false;
    this.hasValidating = false;

    this.messages = [];
    this.log = [];

    const results: Validate[] = [];

    let hasLog = false;
    let hasInfo = false;
    let hasSuccess = false;
    let hasWarning = false;
    let hasError = false;
    let hasValidating = false;

    const log: Log[] = [];
    const messages: string[] = [];

    if (data) {
      if (isArray(data)) {
        for (const item of data) {
          if (item instanceof Validate) {
            results.push(item);
          } else if (item instanceof ValidateResult) {
            for (const validate of item.toValidate()) {
              results.push(validate);
            }
          } else {
            throw new Error(
              `[ ${this.constructor.name} ][ unexpected item ][ ${JSON.stringify(item)} ]`,
            );
          }
        }
      } else if (data instanceof ValidateResult) {
        for (const validate of data.toValidate()) {
          results.push(validate);
        }
      } else if (data instanceof Validate) {
        results.push(data);
      }
    }

    for (const r of results) {
      if (r.type === logTypeEnum.log) {
        hasLog = true;
      }

      if (r.type === logTypeEnum.info) {
        hasInfo = true;
      }

      if (r.type === logTypeEnum.success) {
        hasSuccess = true;
      }

      if (r.type === logTypeEnum.warning) {
        hasWarning = true;
      }

      if (r.type === logTypeEnum.error) {
        hasError = true;
      }

      if (r.type === logTypeEnum.validating) {
        hasValidating = true;
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
      hasInfo: {
        value: hasInfo,
      },
      hasLog: {
        value: hasLog,
      },
      hasSuccess: {
        value: hasSuccess,
      },
      hasWarning: {
        value: hasWarning,
      },
      hasError: {
        value: hasError,
      },
      hasValidating: {
        value: hasValidating,
      },
      log: {
        value: log,
      },
      messages: {
        value: messages,
      },
    });

    Object.freeze(this);
  }

  public getFieldValidation(field: string): Validate | void {
    let result = this.cache.get(field);

    if (result) {
      return result;
    }

    result = this.results.find((r) => {
      if (isString(r.field)) {
        return r.field === field;
      }

      if (isArray(r.field)) {
        return r.field.includes(field);
      }

      return false;
    });

    if (!result) {
      return;
    }

    this.cache.set(field, result);

    return result;
  }

  public getFieldTitle(field: string): string {
    const v = this.getFieldValidation(field);

    if (v instanceof Validate && isString(v.title)) {
      return v.title;
    }

    return "";
  }

  public getFieldMessage(field: string): string {
    const v = this.getFieldValidation(field);

    if (v instanceof Validate) {
      return v.message;
    }

    return "";
  }

  public getValidateStatus(field: string): any {
    const v = this.getFieldValidation(field);

    if (v instanceof Validate) {
      if (v.type === logTypeEnum.error) {
        return "error";
      }
      if (v.type === logTypeEnum.warning) {
        return "warning";
      }
    }
  }

  public hasFieldError(field: string): boolean {
    const v: Validate | void = this.getFieldValidation(field);

    if (v instanceof Validate) {
      return v.type === logTypeEnum.error;
    }

    return false;
  }

  public hasFieldWarning(field: string): boolean {
    const v: Validate | void = this.getFieldValidation(field);

    if (v instanceof Validate) {
      return v.type === logTypeEnum.warning;
    }

    return false;
  }

  public hasFieldInfo(field: string): boolean {
    const v: Validate | void = this.getFieldValidation(field);

    if (v instanceof Validate) {
      return v.type === logTypeEnum.info;
    }

    return false;
  }

  public hasFieldLog(field: string): boolean {
    const v: Validate | void = this.getFieldValidation(field);

    if (v instanceof Validate) {
      return v.type === logTypeEnum.log;
    }

    return false;
  }

  public toValidate(): Validate[] {
    return this.results.map((r) => r);
  }

  public toObject(): Array<{ [key: string]: any }> {
    return this.results.map((r) => r.toObject());
  }
}

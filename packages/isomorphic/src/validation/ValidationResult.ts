/* eslint-disable @typescript-eslint/no-explicit-any */
import { isArray, isObject, isString } from "@rtcts/utils";
import { DataTransferObject } from "../Entity";
import { Log } from "../log/Log";
import { logTypeEnum } from "../log/logTypeEnum";
import { Validation, ValidationData } from "./Validation";

type ValidationResultData =
  | Array<ValidationResult | Validation | Partial<ValidationData>>
  | ValidationResult
  | Validation
  | Partial<ValidationData>;

export class ValidationResult implements DataTransferObject {
  readonly results: Validation[];

  readonly isValid: boolean;

  readonly hasLog: boolean;
  readonly hasInfo: boolean;
  readonly hasSuccess: boolean;
  readonly hasWarning: boolean;
  readonly hasError: boolean;
  readonly hasValidating: boolean;

  readonly messages: string[];
  readonly logs: Log[];

  private readonly cache: Map<string, Validation> = new Map<string, Validation>();

  constructor(data: ValidationResultData) {
    console.log(data);

    if (!data) {
      throw new Error("ValidationResult(data) data should be defined");
    }

    this.results = [];

    this.isValid = false;

    this.hasLog = false;
    this.hasInfo = false;
    this.hasSuccess = false;
    this.hasWarning = false;
    this.hasError = false;
    this.hasValidating = false;

    this.messages = [];
    this.logs = [];

    const results: Validation[] = [];

    let hasLog = false;
    let hasInfo = false;
    let hasSuccess = false;
    let hasWarning = false;
    let hasError = false;
    let hasValidating = false;

    const logs: Log[] = [];
    const messages: string[] = [];

    if (isArray(data)) {
      for (const item of data) {
        if (item instanceof ValidationResult) {
          for (const validation of item.toValidation()) {
            results.push(validation);
          }
        } else if (item instanceof Validation) {
          results.push(item);
        } else if (isObject(item)) {
          results.push(new Validation(item));
        } else {
          throw new Error(`${this.constructor.name} got unexpected item ${JSON.stringify(item)}`);
        }
      }
    } else if (data instanceof ValidationResult) {
      for (const validation of data.toValidation()) {
        results.push(validation);
      }
    } else if (data instanceof Validation) {
      results.push(data);
    } else if (isObject(data)) {
      results.push(new Validation(data));
    } else {
      throw new Error(`${this.constructor.name} got unexpected data ${JSON.stringify(data)}`);
    }

    for (const { type, message, log } of results) {
      if (type === logTypeEnum.log) {
        hasLog = true;
      }

      if (type === logTypeEnum.info) {
        hasInfo = true;
      }

      if (type === logTypeEnum.success) {
        hasSuccess = true;
      }

      if (type === logTypeEnum.warning) {
        hasWarning = true;
      }

      if (type === logTypeEnum.error) {
        hasError = true;
      }

      if (type === logTypeEnum.validating) {
        hasValidating = true;
      }

      messages.push(message);

      logs.push(Object.freeze(log));
    }

    Object.defineProperties(this, {
      results: {
        value: results.map((result) => Object.freeze(result)),
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
      logs: {
        value: logs,
      },
      messages: {
        value: messages,
      },
    });

    Object.freeze(this);
  }

  getFieldValidation(field: string): Validation | void {
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

  getFieldTitle(field: string): string {
    const v = this.getFieldValidation(field);

    if (v instanceof Validation && isString(v.title)) {
      return v.title;
    }

    return "";
  }

  getFieldMessage(field: string): string {
    const v = this.getFieldValidation(field);

    if (v instanceof Validation) {
      return v.message;
    }

    return "";
  }

  getValidationStatus(field: string): any {
    const v = this.getFieldValidation(field);

    if (v instanceof Validation) {
      if (v.type === logTypeEnum.error) {
        return "error";
      }
      if (v.type === logTypeEnum.warning) {
        return "warning";
      }
    }
  }

  hasFieldError(field: string): boolean {
    const v: Validation | void = this.getFieldValidation(field);

    if (v instanceof Validation) {
      return v.type === logTypeEnum.error;
    }

    return false;
  }

  hasFieldWarning(field: string): boolean {
    const v: Validation | void = this.getFieldValidation(field);

    if (v instanceof Validation) {
      return v.type === logTypeEnum.warning;
    }

    return false;
  }

  hasFieldInfo(field: string): boolean {
    const v: Validation | void = this.getFieldValidation(field);

    if (v instanceof Validation) {
      return v.type === logTypeEnum.info;
    }

    return false;
  }

  hasFieldLog(field: string): boolean {
    const v: Validation | void = this.getFieldValidation(field);

    if (v instanceof Validation) {
      return v.type === logTypeEnum.log;
    }

    return false;
  }

  clone(): ValidationResult {
    return new ValidationResult(this);
  }

  toValidation(): Validation[] {
    return this.results.map((r) => r);
  }

  toObject(): ValidationData[] {
    return this.results.map((r) => r.toObject());
  }

  toJSON(): ValidationData[] {
    return this.toObject();
  }

  toJS(): ValidationData[] {
    return this.toObject();
  }
}

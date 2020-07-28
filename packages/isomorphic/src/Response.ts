/* eslint-disable @typescript-eslint/no-explicit-any */
import { isArray, isNumber, isUndefined } from "@rtcts/utils";
import { ValidationData } from "./validation/Validation";
import { ValidationResult } from "./validation/ValidationResult";

export class ListResponse<T = any> {
  readonly count: number;
  readonly payload: T[];
  readonly validationResult: ValidationResult;

  constructor(data?: Omit<ListResponse<T>, "toJSON">) {
    if (data) {
      if (isNumber(data.count)) {
        this.count = data.count;
      } else {
        throw new Error("ListResponse.count should be number");
      }

      if (isArray<T>(data.payload)) {
        this.payload = data.payload;
      } else {
        throw new Error("ListResponse.payload is undefined");
      }

      if (isArray<ValidationData>(data.validationResult)) {
        this.validationResult = new ValidationResult(data.validationResult);
      } else {
        throw new Error("ListResponse.validationResult should be array of ValidationData");
      }
    } else {
      throw new Error("ListResponse data is undefined");
    }
  }

  public toJSON(): {
    count: number;
    payload: T[];
    validationResult: ValidationData[];
  } {
    return {
      count: this.count,
      payload: this.payload,
      validationResult: this.validationResult
        .toValidation()
        .map((validation) => validation.toJSON()),
    };
  }
}

export class Response<T = any> {
  readonly payload: T;
  readonly validationResult: ValidationResult;

  constructor(data?: Omit<Response<T>, "toJSON">) {
    this.payload = {} as T;
    this.validationResult = new ValidationResult([]);

    if (data) {
      if (!isUndefined(data.payload)) {
        this.payload = data.payload;
      } else {
        throw new TypeError("Response.payload is undefined");
      }

      if (isArray(data.validationResult)) {
        this.validationResult = new ValidationResult(data.validationResult);
      } else {
        throw new Error("Response.validationResult should be array of ValidationData");
      }
    } else {
      throw new Error("Response data is undefined");
    }
  }

  public toJSON(): { payload: T; validationResult: ValidationData[] } {
    return {
      payload: this.payload,
      validationResult: this.validationResult
        .toValidation()
        .map((validation) => validation.toJSON()),
    };
  }
}

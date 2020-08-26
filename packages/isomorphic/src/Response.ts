import { isArray } from "@rtcts/utils";
import { ValidationData } from "./validation/Validation";
import { ValidationResult } from "./validation/ValidationResult";

export class ListResponse<T = any> {
  readonly count: number;
  readonly payload: T[];
  readonly validationResult: ValidationResult;

  constructor(data: Omit<ListResponse<T>, "toJSON">) {
    if (data) {
      this.count = 0;
      this.payload = [];
      this.validationResult = new ValidationResult([]);

      if (typeof data.count === "number") {
        this.count = data.count;
      } else {
        throw new Error("ListResponse.count should be number");
      }

      if (isArray<T>(data.payload)) {
        this.payload = data.payload;
      } else {
        throw new Error("ListResponse.payload should be an array");
      }

      if (data.validationResult instanceof ValidationResult) {
        this.validationResult = new ValidationResult(data.validationResult);
      } else if (isArray(data.validationResult)) {
        this.validationResult = new ValidationResult(data.validationResult);
      } else {
        throw new Error(
          "ListResponse.validationResult should be instance of ValidationResult or array of ValidationData",
        );
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
  readonly payload: T | null;
  readonly validationResult: ValidationResult;

  constructor(data: Omit<Response<T>, "toJSON">) {
    this.payload = null;
    this.validationResult = new ValidationResult([]);

    if (data) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      if (typeof data.payload !== "undefined") {
        this.payload = data.payload;
      } else {
        throw new TypeError("Response.payload should not be undefined");
      }

      if (data.validationResult instanceof ValidationResult) {
        this.validationResult = new ValidationResult(data.validationResult);
      } else if (isArray(data.validationResult)) {
        this.validationResult = new ValidationResult(data.validationResult);
      } else {
        throw new TypeError(
          "Response.validationResult should be instance of ValidationResult or array of ValidationData",
        );
      }
    } else {
      throw new Error("Response data is undefined");
    }
  }

  public toJSON(): { payload: T | null; validationResult: ValidationData[] } {
    return {
      payload: this.payload,
      validationResult: this.validationResult
        .toValidation()
        .map((validation) => validation.toJSON()),
    };
  }
}

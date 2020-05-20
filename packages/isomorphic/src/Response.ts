import { isArray, isNumber, isUndefined } from "@rtcts/utils";
import { ValidateData } from "./validate/Validate";
import { ValidateResult } from "./validate/ValidateResult";

export class ListResponse<T = any> {
  readonly count: number;
  readonly results: T[];
  readonly validates: ValidateResult;

  constructor(data?: Omit<ListResponse<T>, "toJSON">) {
    if (data) {
      if (isNumber(data.count)) {
        this.count = data.count;
      } else {
        throw new Error("ListResponse.count isn't valid");
      }

      if (isArray<T>(data.results)) {
        this.results = data.results;
      } else {
        throw new Error("ListResponse.results isn't valid");
      }

      if (isArray<ValidateData>(data.validates) || data.validates instanceof ValidateResult) {
        this.validates = new ValidateResult(data.validates);
      } else {
        throw new Error("ListResponse.validates isn't valid");
      }
    } else {
      throw new Error("ListResponse isn't valid");
    }
  }

  public toJSON(): {
    count: number;
    results: T[];
    validates: ValidateData[];
  } {
    return {
      count: this.count,
      results: this.results,
      validates: this.validates.toJSON(),
    };
  }
}

export class Response<T = any> {
  readonly result: T;
  readonly validates: ValidateResult;

  constructor(data?: Omit<Response<T>, "toJSON">) {
    if (data) {
      if (!isUndefined(data.result)) {
        this.result = data.result;
      } else {
        throw new Error("Response.result isn't valid");
      }

      if (isArray(data.validates) || data.validates instanceof ValidateResult) {
        this.validates = new ValidateResult(data.validates);
      } else {
        throw new Error("Response.validates isn't valid");
      }
    } else {
      throw new Error("Response isn't valid");
    }
  }

  public toJSON(): {
    result: T;
    validates: ValidateData[];
  } {
    return {
      result: this.result,
      validates: this.validates.toJSON(),
    };
  }
}

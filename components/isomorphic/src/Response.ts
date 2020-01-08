import { isArray, isNumber, isUndefined } from "@rtcts/utils";
import { ValidateData } from "./validate/Validate";
import { ValidateResult } from "./validate/ValidateResult";

export class ListResponse {
  readonly count: number;
  readonly results: any[];
  readonly validates: ValidateResult;

  constructor(data?: Omit<ListResponse, "toJSON">) {
    if (data) {
      if (isNumber(data.count)) {
        this.count = data.count;
      } else {
        throw new Error("ListResponse.count isn't valid");
      }

      if (isArray(data.results)) {
        this.results = data.results;
      } else {
        throw new Error("ListResponse.results isn't valid");
      }

      if (isArray<ValidateData>(data.validates)) {
        this.validates = new ValidateResult(data.validates);
      } else {
        throw new Error("ListResponse.validates isn't valid");
      }
    } else {
      throw new Error("ListResponse isn't valid");
    }
  }

  public toJSON(): object {
    return {
      count: this.count,
      results: this.results,
      validates: this.validates.toJSON(),
    };
  }
}

export class Response {
  readonly result: any;
  readonly validates: ValidateResult;

  constructor(data?: Omit<Response, "toJSON">) {
    if (data) {
      if (!isUndefined(data.result)) {
        this.result = data.result;
      } else {
        throw new Error("Response.result isn't valid");
      }

      if (isArray(data.validates)) {
        this.validates = new ValidateResult(data.validates);
      } else {
        throw new Error("Response.validates isn't valid");
      }
    } else {
      throw new Error("Response isn't valid");
    }
  }

  public toJSON(): object {
    return {
      result: this.result,
      validates: this.validates.toJSON(),
    };
  }
}

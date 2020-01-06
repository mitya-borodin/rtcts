import { isArray, isNumber, isObject, isString } from "@rtcts/utils";
import { ValidateResult } from "./validate/ValidateResult";

export class ListResponse {
  readonly count: number;
  readonly previous: string | null;
  readonly next: string | null;
  readonly results: any[];
  readonly validates: ValidateResult;

  constructor(data?: any) {
    if (data) {
      if (isNumber(data.count)) {
        this.count = data.count;
      } else {
        throw new Error("ListResponse.count isn't valid");
      }

      if (isString(data.previous) || data.previous === null) {
        this.previous = data.previous;
      } else {
        throw new Error("ListResponse.previous isn't valid");
      }

      if (isString(data.next) || data.next === null) {
        this.next = data.next;
      } else {
        throw new Error("ListResponse.next isn't valid");
      }

      if (isArray(data.results)) {
        this.results = data.results;
      } else {
        throw new Error("ListResponse.results isn't valid");
      }

      if (isArray(data.validates)) {
        this.validates = new ValidateResult(data.validates);
      } else {
        throw new Error("ListResponse.validates isn't valid");
      }
    } else {
      throw new Error("ListResponse isn't valid");
    }
  }
}

export class Response {
  readonly result: any;
  readonly validates: ValidateResult;

  constructor(data?: any) {
    if (data) {
      if (isObject(data.result)) {
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
}

import { isString } from "./isType";

export function detectID(data?: any): string {
  if (data) {
    if (isString(data.id) && data.id.length > 0) {
      return data.id;
    } else if (isString(data._id) && data._id.length > 0) {
      return data._id;
    } else if (data._id && data._id.toHexString) {
      return data._id.toHexString();
    } else {
      throw new Error(`[ detectID ][ id | _id ] must be a not empty string | ObjectId;`);
    }
  }

  return "";
}

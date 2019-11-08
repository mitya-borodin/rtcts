import { isString, isUndefined } from "./isType";

export function getErrorMessage(error: any) {
  const message = "error message not forund";

  if (isUndefined(error)) {
    return message;
  }

  if (isString(error)) {
    return error;
  }

  if (error instanceof Error || isString(error.message)) {
    return error.message;
  }

  return message;
}

import { isString, isUndefined } from "./isType";

export function getErrorMessage(error?: Error | string): string {
  const message = "error message not found";

  if (isUndefined(error)) {
    return message;
  }

  if (isString(error)) {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return message;
}

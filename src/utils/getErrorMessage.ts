import { isString } from "./isType";

export function getErrorMessage(error: any) {
  let message = "error message not forund";

  if (error instanceof Error || isString(error.message)) {
    message = error.message;
  }

  if (isString(error)) {
    message = error;
  }

  return message;
}

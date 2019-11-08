import { isString } from "./isType";

export function getAttribute(attr: string, element: any): string | null {
  const result = element.getAttribute(attr);

  if (isString(result)) {
    return result;
  } else {
    const parentElement = element.parentElement;

    if (parentElement === null) {
      return null;
    } else {
      return getAttribute(attr, parentElement);
    }
  }

  return null;
}

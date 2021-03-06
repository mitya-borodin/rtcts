import { isString } from "./isType";

export function getAttribute(attr: string, element: HTMLElement): string | null {
  const result: string | null = element.getAttribute(attr);

  if (isString(result)) {
    return result;
  } else {
    const parentElement: HTMLElement | null = element.parentElement;

    if (parentElement === null) {
      return null;
    } else {
      return getAttribute(attr, parentElement);
    }
  }
}

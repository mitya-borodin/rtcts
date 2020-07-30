export function isString<T = string>(test: any): test is T {
  return Object.prototype.toString.call(test) === "[object String]";
}

export function isNumber<T = number>(test: any): test is T {
  return Object.prototype.toString.call(test) === "[object Number]" && !Number.isNaN(test);
}

export function isBoolean<T = boolean>(test: any): test is T {
  return Object.prototype.toString.call(test) === "[object Boolean]";
}

export function isUndefined<T = undefined | null | void>(test: any): test is T {
  const result = Object.prototype.toString.call(test);

  return result === "[object Undefined]" || result === "[object Null]";
}

export function isObject<T = { [key: string]: any }>(test: any): test is T {
  return Object.prototype.toString.call(test) === "[object Object]";
}

export function isFunction<T = Function>(test: any): test is T {
  return Object.prototype.toString.call(test) === "[object Function]";
}

export function isDate<T = Date>(test: any): test is T {
  const date = new Date(test);

  return date.toString() !== "Invalid Date" && test !== null;
}

export function isArray<T>(test: any): test is T[] {
  return Array.isArray(test) || (test && isNumber(test.length) && isFunction(test.map));
}

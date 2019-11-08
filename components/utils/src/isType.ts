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

export function isObject<T = object>(test: any): test is T {
  return Object.prototype.toString.call(test) === "[object Object]";
}

// tslint:disable-next-line:ban-types
export function isFunction<T = Function>(test: any): test is T {
  return Object.prototype.toString.call(test) === "[object Function]";
}

export function isDate<T = Date>(test: any): test is T {
  const date = new Date(test);

  return date.toString() !== "Invalid Date" && test !== null;
}

export function isArray<T>(test: any): test is T[] {
  return (
    Object.prototype.toString.call(test) === "[object Array]" ||
    (test && isNumber(test.length) && isFunction(test.map))
  );
}

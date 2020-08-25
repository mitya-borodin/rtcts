export function isUndefined<T = undefined>(test: any): test is T {
  return Object.prototype.toString.call(test) === "[object Undefined]";
}

export function isNull<T = null>(test: any): test is T {
  return Object.prototype.toString.call(test) === "[object Null]";
}

export function isObject<T = { [key: string]: any }>(test: any): test is T {
  return Object.prototype.toString.call(test) === "[object Object]";
}

export function isFunction<T = Function>(test: any): test is T {
  return Object.prototype.toString.call(test) === "[object Function]";
}

export function isBoolean<T = boolean>(test: any): test is T {
  return Object.prototype.toString.call(test) === "[object Boolean]";
}

export function isString<T = string>(test: any): test is T {
  return Object.prototype.toString.call(test) === "[object String]";
}

export function isNumber<T = number>(test: any): test is T {
  return Object.prototype.toString.call(test) === "[object Number]" && !Number.isNaN(test);
}

export function isArray<T>(test: any): test is T[] {
  return Array.isArray(test) || (test && isNumber(test.length) && isFunction(test.map));
}

export function isDate<T = Date>(test: any): test is T {
  const date = new Date(test);

  return date.toString() !== "Invalid Date" && test !== null;
}

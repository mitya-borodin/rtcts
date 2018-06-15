export function isString(test: any): test is string {
  return Object.prototype.toString.call(test) === "[object String]";
}

export function isNumber(test: any): test is number {
  return (
    Object.prototype.toString.call(test) === "[object Number]" &&
    !Number.isNaN(test)
  );
}

export function isBoolean(test: any): test is boolean {
  return Object.prototype.toString.call(test) === "[object Boolean]";
}

export function isUndefined(test: any): test is undefined | void {
  return Object.prototype.toString.call(test) === "[object Undefined]";
}

export function isObject(test: any): test is object {
  return Object.prototype.toString.call(test) === "[object Object]";
}

export function isFunction(test: any): boolean {
  return Object.prototype.toString.call(test) === "[object Function]";
}

export function isDate(test: any): test is Date {
  const date = new Date(test);

  return date.toString() !== "Invalid Date" && test !== null;
}

export function isArray<T>(test: any): test is T[] {
  return (
    Object.prototype.toString.call(test) === "[object Array]" ||
    (test && isNumber(test.length) && isFunction(test.map))
  );
}

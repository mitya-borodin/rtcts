import { Moment } from "moment";
import { isBoolean } from "./isType";

export function overlaps(
  x_0: Moment,
  x_1: Moment,
  y_0: Moment,
  y_1: Moment,
  a_includeLeftBoundary?: boolean,
  a_includeRightBoundary?: boolean,
): boolean;
export function overlaps(x_0: Moment, x_1: Moment, y_0: Moment, y_1: Moment): boolean {
  let includeBoundary = false;
  let includeLeftBoundary = false;
  let includeRightBoundary = false;

  if (arguments.length === 5) {
    includeBoundary = isBoolean(arguments[4]) ? arguments[4] : false;
    includeLeftBoundary = includeBoundary;
    includeRightBoundary = includeBoundary;
  }

  if (arguments.length === 6) {
    includeLeftBoundary = isBoolean(arguments[4]) ? arguments[4] : false;
    includeRightBoundary = isBoolean(arguments[5]) ? arguments[4] : false;
    includeBoundary = includeLeftBoundary || includeRightBoundary;
  }

  // Частный случа, когда временные отрезки одинаковы
  if (x_0.isSame(y_0) && x_1.isSame(y_1)) {
    return true;
  }

  if (Math.abs(x_0.diff(x_1, "ms")) > Math.abs(y_0.diff(y_1, "ms"))) {
    if (includeBoundary) {
      if (includeLeftBoundary) {
        if (y_0.isSameOrAfter(x_0) && y_0.isSameOrBefore(x_1)) {
          return true;
        }
      } else {
        if (y_0.isAfter(x_0) && y_0.isBefore(x_1)) {
          return true;
        }
      }

      if (includeRightBoundary) {
        if (y_1.isSameOrAfter(x_0) && y_1.isSameOrBefore(x_1)) {
          return true;
        }
      } else {
        if (y_1.isAfter(x_0) && y_1.isBefore(x_1)) {
          return true;
        }
      }
    } else {
      if (y_0.isAfter(x_0) && y_0.isBefore(x_1)) {
        return true;
      }

      if (y_1.isAfter(x_0) && y_1.isBefore(x_1)) {
        return true;
      }
    }
  } else {
    if (includeBoundary) {
      if (includeLeftBoundary) {
        if (x_0.isSameOrAfter(y_0) && x_0.isSameOrBefore(y_1)) {
          return true;
        }
      } else {
        if (x_0.isAfter(y_0) && x_0.isBefore(y_1)) {
          return true;
        }
      }

      if (includeRightBoundary) {
        if (x_1.isSameOrAfter(y_0) && x_1.isSameOrBefore(y_1)) {
          return true;
        }
      } else {
        if (x_1.isAfter(y_0) && x_1.isBefore(y_1)) {
          return true;
        }
      }
    } else {
      if (x_0.isAfter(y_0) && x_0.isBefore(y_1)) {
        return true;
      }

      if (x_1.isAfter(y_0) && x_1.isBefore(y_1)) {
        return true;
      }
    }
  }

  return false;
}

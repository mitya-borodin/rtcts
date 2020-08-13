/* eslint-disable prefer-rest-params */
import { Moment } from "moment";
import { isBoolean } from "@rtcts/utils";

export function overlaps(
  x0: Moment,
  x1: Moment,
  y0: Moment,
  y1: Moment,
  argIncludeLeftBoundary?: boolean,
  argIncludeRightBoundary?: boolean,
): boolean;
export function overlaps(x0: Moment, x1: Moment, y0: Moment, y1: Moment): boolean {
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
    includeRightBoundary = isBoolean(arguments[5]) ? arguments[5] : false;
    includeBoundary = includeLeftBoundary || includeRightBoundary;
  }

  // Частный случа, когда временные отрезки одинаковы
  if (x0.isSame(y0) && x1.isSame(y1)) {
    return true;
  }

  if (Math.abs(x0.diff(x1, "ms")) > Math.abs(y0.diff(y1, "ms"))) {
    if (includeBoundary) {
      if (includeLeftBoundary) {
        if (y0.isSameOrAfter(x0) && y0.isSameOrBefore(x1)) {
          return true;
        }
      } else {
        if (y0.isAfter(x0) && y0.isBefore(x1)) {
          return true;
        }
      }

      if (includeRightBoundary) {
        if (y1.isSameOrAfter(x0) && y1.isSameOrBefore(x1)) {
          return true;
        }
      } else {
        if (y1.isAfter(x0) && y1.isBefore(x1)) {
          return true;
        }
      }
    } else {
      if (y0.isAfter(x0) && y0.isBefore(x1)) {
        return true;
      }

      if (y1.isAfter(x0) && y1.isBefore(x1)) {
        return true;
      }
    }
  } else {
    if (includeBoundary) {
      if (includeLeftBoundary) {
        if (x0.isSameOrAfter(y0) && x0.isSameOrBefore(y1)) {
          return true;
        }
      } else {
        if (x0.isAfter(y0) && x0.isBefore(y1)) {
          return true;
        }
      }

      if (includeRightBoundary) {
        if (x1.isSameOrAfter(y0) && x1.isSameOrBefore(y1)) {
          return true;
        }
      } else {
        if (x1.isAfter(y0) && x1.isBefore(y1)) {
          return true;
        }
      }
    } else {
      if (x0.isAfter(y0) && x0.isBefore(y1)) {
        return true;
      }

      if (x1.isAfter(y0) && x1.isBefore(y1)) {
        return true;
      }
    }
  }

  return false;
}

import { Moment } from "moment";

export function overlaps(x_0: Moment, x_1: Moment, y_0: Moment, y_1: Moment, includeBoundary = true): boolean {
  let hasOverlaps = false;

  if (Math.abs(x_0.diff(x_1, "ms")) > Math.abs(y_0.diff(y_1, "ms"))) {
    if (includeBoundary) {
      if (y_0.isSameOrAfter(x_0) && y_0.isSameOrBefore(x_1)) {
        hasOverlaps = true;
      }

      if (y_1.isSameOrAfter(x_0) && y_1.isSameOrBefore(x_1)) {
        hasOverlaps = true;
      }
    } else {
      if (y_0.isAfter(x_0) && y_0.isBefore(x_1)) {
        hasOverlaps = true;
      }

      if (y_1.isAfter(x_0) && y_1.isBefore(x_1)) {
        hasOverlaps = true;
      }
    }
  } else {
    if (includeBoundary) {
      if (x_0.isSameOrAfter(y_0) && x_0.isSameOrBefore(y_1)) {
        hasOverlaps = true;
      }

      if (x_1.isSameOrAfter(y_0) && x_1.isSameOrBefore(y_1)) {
        hasOverlaps = true;
      }
    } else {
      if (x_0.isAfter(y_0) && x_0.isBefore(y_1)) {
        hasOverlaps = true;
      }

      if (x_1.isAfter(y_0) && x_1.isBefore(y_1)) {
        hasOverlaps = true;
      }
    }
  }

  return hasOverlaps;
}

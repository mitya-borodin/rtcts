import { Moment } from "moment";
import { overlaps } from "./overlaps";

function makeLength(
  big_0: Moment,
  big_1: Moment,
  small_0: Moment,
  small_1: Moment,
): number {
  if (small_0.isSameOrAfter(big_0) && small_0.isBefore(big_1)) {
    return big_1.diff(small_0, "minutes");
  }

  if (
    small_0.isBefore(big_0) &&
    small_1.isAfter(big_0) &&
    small_1.isSameOrBefore(big_1)
  ) {
    return small_1.diff(big_0, "minutes");
  }

  if (small_0.isSameOrBefore(big_0) && small_1.isSameOrAfter(big_1)) {
    return big_1.diff(big_0, "minutes");
  }

  return 0;
}

export function intersection(
  x_0: Moment,
  x_1: Moment,
  y_0: Moment,
  y_1: Moment,
): number {
  if (overlaps(x_0, x_1, y_0, y_1)) {
    if (Math.abs(x_0.diff(x_1, "ms")) > Math.abs(y_0.diff(y_1, "ms"))) {
      return Math.abs(makeLength(x_0, x_1, y_0, y_1));
    } else {
      return Math.abs(makeLength(y_0, y_1, x_0, x_1));
    }
  }

  return 0;
}

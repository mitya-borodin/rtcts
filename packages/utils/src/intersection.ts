import { Moment } from "moment";
import { overlaps } from "./overlaps";

function makeLength(bigZero: Moment, bigOne: Moment, smallZero: Moment, smallOne: Moment): number {
  if (smallZero.isSameOrAfter(bigZero) && smallZero.isBefore(bigOne)) {
    return bigOne.diff(smallZero, "minutes");
  }

  if (smallZero.isBefore(bigZero) && smallOne.isAfter(bigZero) && smallOne.isSameOrBefore(bigOne)) {
    return smallOne.diff(bigZero, "minutes");
  }

  if (smallZero.isSameOrBefore(bigZero) && smallOne.isSameOrAfter(bigOne)) {
    return bigOne.diff(bigZero, "minutes");
  }

  return 0;
}

export function intersection(xZero: Moment, xOne: Moment, yZero: Moment, yOne: Moment): number {
  if (overlaps(xZero, xOne, yZero, yOne)) {
    if (Math.abs(xZero.diff(xOne, "ms")) > Math.abs(yZero.diff(yOne, "ms"))) {
      return Math.abs(makeLength(xZero, xOne, yZero, yOne));
    } else {
      return Math.abs(makeLength(yZero, yOne, xZero, xOne));
    }
  }

  return 0;
}

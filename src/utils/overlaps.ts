import { Moment } from "moment";

export function overlaps( x_0: Moment, x_1: Moment, y_0: Moment, y_1: Moment ): boolean {
  let hasOverlaps = false;

  if ( y_0.isSameOrAfter( x_0 ) && y_0.isSameOrBefore( x_1 ) ) {
    hasOverlaps = true;
  }

  if ( y_1.isSameOrAfter( x_0 ) && y_1.isSameOrBefore( x_1 ) ) {
    hasOverlaps = true;
  }

  return hasOverlaps;
}

import { Moment } from "moment";

export function timeOnly(date: Moment): Moment {
  return date
    .clone()
    .year(0)
    .month(0)
    .date(1)
    .second(0)
    .millisecond(0);
}

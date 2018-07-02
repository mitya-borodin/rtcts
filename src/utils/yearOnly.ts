import { Moment } from "moment";

export function yearOnly(date: Moment): Moment {
  return date
    .clone()
    .month(0)
    .date(1)
    .hour(0)
    .minute(0)
    .second(0)
    .millisecond(0);
}

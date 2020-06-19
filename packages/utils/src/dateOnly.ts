import { Moment } from "moment";

export function dateOnly(date: Moment): Moment {
  return date
    .clone()
    .hour(0)
    .minute(0)
    .second(0)
    .millisecond(0);
}

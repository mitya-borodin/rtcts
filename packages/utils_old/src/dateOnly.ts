import moment from "moment";

export function dateOnly(date: moment.Moment): moment.Moment {
  return date.clone().hour(0).minute(0).second(0).millisecond(0);
}

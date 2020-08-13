import { separateMinutes } from "./separateMinutes";

export function formatMinutes(allMin: number): string {
  const isNegative = allMin < 0;
  const { hours, minutes } = separateMinutes(Math.abs(allMin));

  return `${isNegative ? "-" : ""}${hours < 10 ? `0${String(hours)}` : String(hours)}:${
    minutes < 10 ? `0${String(minutes)}` : String(minutes)
  }`;
}

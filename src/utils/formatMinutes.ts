import { separateMinutes } from "./separateMinutes";

export function formatMinutes( allMin: number ): string {
  const { hours, minutes } = separateMinutes( allMin );

  return `${hours < 10 ? "0" + hours : hours}:${minutes < 10 ? "0" + minutes : minutes}`;
}

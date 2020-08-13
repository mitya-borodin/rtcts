import { isMoment, Moment } from "moment";
import { overlaps } from "./overlaps";

/**
 * overlapsRS - overlaps for ray and section;
 * Находит пересечение для:
 * 1) Двух отрезков;
 * 2) Отрезка и луча;
 * 3) Двух лучей;
 *
 * @export
 * @param {Moment} X_0 - Date from;
 * @param {(Moment | void)} X_1 - Date to;
 * @param {Moment} Y_0 - Date from;
 * @param {(Moment | void)} Y_1 - Date to;
 * @returns {boolean} - hasOverlap;
 */
export function overlapsRS(
  X_0: Moment,
  X_1: Moment | void,
  Y_0: Moment,
  Y_1: Moment | void,
): boolean {
  let hasOverlap = false;

  if (isMoment(X_1)) {
    if (isMoment(Y_1)) {
      // Поиск пересечений по отрезку;
      if (overlaps(X_0, X_1, Y_0, Y_1, true)) {
        hasOverlap = true;
      }
    } else {
      // Поиск пересечений по отрезку X_0 - X_1 и лучу Y_0 - Infinity;
      if (Y_0.isSameOrAfter(X_0) && Y_0.isSameOrBefore(X_1)) {
        hasOverlap = true;
      }

      if (Y_0.isBefore(X_0)) {
        hasOverlap = true;
      }
    }
  } else {
    if (isMoment(Y_1)) {
      // Поиск пересечений по лучу X_0 - Infinity и отрезку Y_0 - Y_1;
      if (X_0.isSameOrAfter(Y_0) && X_0.isSameOrBefore(Y_1)) {
        hasOverlap = true;
      }

      if (X_0.isBefore(Y_0)) {
        hasOverlap = true;
      }
    } else {
      // ! Тут будет два луча и 100% пересечение.
      // ! Существует только две даты X_0 и Y_0.
      // ! Так как лучи уходят в бесконечность, то пересекаются.

      hasOverlap = true;
    }
  }

  return hasOverlap;
}

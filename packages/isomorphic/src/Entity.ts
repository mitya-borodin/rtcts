/* eslint-disable @typescript-eslint/no-explicit-any */
import { ValidationResult } from "./validation/ValidationResult";

export interface DataTransferObject {
  toObject(): any;
  toJSON(): any;
  toJS(): any;
}

export interface ValueObject extends DataTransferObject {
  isInsert(): boolean;
  validation(): ValidationResult;
}

export interface Entity extends ValueObject {
  isEntity(): this is { id: string };
  hasId(): this is { id: string };
}

export interface EntityId {
  id?: string;
}

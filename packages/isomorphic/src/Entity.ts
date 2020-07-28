import { ValidationResult } from "./validation/ValidationResult";

export interface EssentialObject {
  toObject(): any;
  toJSON(): any;
  toJS(): any;
}

export interface ValueObject extends EssentialObject {
  isInsert(): boolean;
  validation(): ValidationResult;
}

export interface Entity extends ValueObject {
  isEntity(): this is { id: string };
}

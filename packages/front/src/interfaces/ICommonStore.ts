export interface ISingletonStore<T> {
  pending: boolean;

  value: T | void;

  init(): Promise<void>;
  update(value: object): Promise<T | void>;
}

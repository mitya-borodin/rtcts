export interface ISingletonRepository<T> {
  pending: boolean;

  entity: T | void;

  init(): Promise<void>;
  update(entity: object): Promise<T | void>;
}

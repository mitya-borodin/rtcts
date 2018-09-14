export interface IService<T> {
  ACL: {
    collection: string[];
    model: string[];
    create: string[];
    remove: string[];
    update: string[];
    onChannel: string[];
    offChannel: string[];
  };
  group: string;

  collection(): Promise<T[] | void>;
  model(id: string): Promise<T | void>;
  create(data: object): Promise<T | void>;
  update(data: object): Promise<T | void>;
  remove(id: string): Promise<T | void>;
  onChannel(): Promise<void>;
  offChannel(): Promise<void>;
}

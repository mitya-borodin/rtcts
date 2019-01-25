import { IBaseService } from "./IBaseService";

export interface IService<T> extends IBaseService<T> {
  ACL: {
    collection: string[];
    model: string[];
    create: string[];
    remove: string[];
    update: string[];
    onChannel: string[];
    offChannel: string[];
  };

  collection(): Promise<T[] | void>;
  model(id: string): Promise<T | void>;
  create(data: object): Promise<T | void>;
  update(data: object): Promise<T | void>;
  remove(id: string): Promise<T | void>;
}

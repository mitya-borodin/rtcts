import { IBaseService } from "./IBaseService";

export interface ICommonService<T> extends IBaseService<T> {
  ACL: {
    model: string[];
    update: string[];
    onChannel: string[];
    offChannel: string[];
  };

  model(): Promise<T | void>;
  update(data: object): Promise<T | void>;
}

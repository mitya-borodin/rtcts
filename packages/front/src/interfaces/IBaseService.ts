export interface IBaseService<T> {
  ACL: {
    onChannel: string[];
    offChannel: string[];
  };
  group: string;

  onChannel(): Promise<void>;
  offChannel(): Promise<void>;
}

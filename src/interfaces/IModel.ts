export interface IModel<P, I> {
  read(): Promise<P[]>;

  readById(id: string): Promise<P | null>;

  getMap(): Promise<Map<string, P>>;

  create(data: object, uid: string, wsid: string): Promise<P | null>;

  update(data: object, uid: string, wsid: string): Promise<P | null>;

  remove(id: string, uid: string, wsid: string): Promise<P | null>;
}

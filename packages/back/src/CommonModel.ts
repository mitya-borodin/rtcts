import { IInsert, IEntity } from "@borodindmitriy/interfaces";
import { isObject } from "@borodindmitriy/utils";
import { Collection, FindOneAndReplaceOption } from "mongodb";
import { ICommonModel } from "./interfaces/ICommonModel";
import { IRepository } from "./interfaces/IRepository";
import { toMongo } from "./toMongo";

export class CommonModel<P extends IEntity, I extends IInsert, R extends IRepository<P> = IRepository<P>>
  implements ICommonModel<P> {
  protected readonly repository: R;
  protected readonly Persist: { new (data?: any): P };
  protected readonly Insert: { new (data?: any): I };
  protected readonly send: (payload: object, uid: string, wsid: string, excludeCurrentDevice?: boolean) => void;

  constructor(
    repository: R,
    Persist: { new (data?: any): P },
    Insert: { new (data?: any): I },
    send: (payload: object, uid: string, wsid: string, excludeCurrentDevice?: boolean) => void,
  ) {
    this.repository = repository;
    this.Persist = Persist;
    this.Insert = Insert;
    this.send = send;
  }

  public async read(): Promise<P | null> {
    try {
      const item: object | null = await this.repository.findOne({});

      if (item) {
        return new this.Persist(item);
      }
    } catch (error) {
      const collection: Collection<P> = await this.repository.getCollection();

      await collection.drop();

      console.error(error);
    }

    return null;
  }

  public async update(
    data: { [key: string]: any },
    uid: string,
    wsid: string,
    options?: FindOneAndReplaceOption,
    excludeCurrentDevice?: boolean,
  ): Promise<P | null> {
    try {
      const curValue: P | null = await this.read();

      if (curValue === null) {
        const insert: I = new this.Insert(data);
        const result: any = await this.repository.insertOne(
          insert.toJS(),
          isObject(options) && Object.keys(options).length > 0 ? options : undefined,
        );
        const persist: P = new this.Persist(result);

        this.send({ create: persist.toJS() }, uid, wsid, excludeCurrentDevice);

        return persist;
      } else {
        let persist: P = new this.Persist(data);

        const { _id, ...$set } = toMongo(persist);

        const result: any | null = await this.repository.findOneAndUpdate(
          { _id },
          { $set },
          {
            returnOriginal: false,
            ...(isObject(options) && Object.keys(options).length > 0 ? options : undefined),
          },
        );

        if (result !== null) {
          persist = new this.Persist(result);

          this.send({ update: persist.toJS() }, uid, wsid, excludeCurrentDevice);

          return persist;
        }
      }
    } catch (error) {
      console.error(error);
    }

    return null;
  }
}

import { ObjectId } from "bson";
import { IPersist } from "../interfaces/IPersist";
import { isUndefined } from "../utils/isType";

export function toMongo<T extends IPersist>(instance: T): { [key: string]: any } & { _id: ObjectId } {
  const { id, ...data }: any = instance.toJS();

  if (isUndefined(id)) {
    throw new Error("[ toMongo ] - expected that id is defined, but right now id is undefined;");
  }

  return Object.assign({}, { _id: new ObjectId(id) }, data);
}

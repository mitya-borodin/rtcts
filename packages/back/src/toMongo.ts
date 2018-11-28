import { IPersist } from "@borodindmitriy/interfaces";
import { isUndefined } from "@borodindmitriy/utils";
import { ObjectId } from "bson";

export function toMongo<T extends IPersist>(persist: T): { [key: string]: any } & { _id: ObjectId } {
  const { id, ...data }: any = persist.toJS();

  if (isUndefined(id)) {
    throw new Error("[ toMongo ] - expected that id is defined, but right now id is undefined;");
  }

  return Object.assign({}, { _id: new ObjectId(id) }, data);
}

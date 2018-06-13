import { ObjectId } from "bson";
import { IInsert } from "../interfaces/IInsert";
import { isUndefined } from "../utils/isType";

function toMongo<T extends IInsert>( instance: T ): { [ key: string ]: any } & { _id: ObjectId } {
  const { id, ...data }: any = instance.toJS();

  if ( isUndefined( id ) ) {
    throw new Error( "[toMongo] - expected that id is defined, but right now id is undefined;" );
  }

  return Object.assign( {}, { _id: ObjectId( id ) }, data );
}

export default toMongo;
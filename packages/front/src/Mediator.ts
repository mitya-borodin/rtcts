import { EventEmitter } from "@borodindmitriy/isomorphic";
import { IMediator } from "./interfaces/IMediator";

export class Mediator extends EventEmitter implements IMediator {}

import { EventEmitter } from "./../isomorphic/EventEmitter";
import { IMediator } from "./interfaces/IMediator";

export class Mediator extends EventEmitter implements IMediator {}

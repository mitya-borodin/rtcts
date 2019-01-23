import { EventEmitter } from "./EventEmitter";
import { IMediator } from "./interfaces/IMediator";

export class Mediator extends EventEmitter implements IMediator {}

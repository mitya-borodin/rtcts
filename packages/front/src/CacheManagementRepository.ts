import { IForm, IPersist } from "@borodindmitriy/interfaces";
import { isArray, isObject } from "@borodindmitriy/utils";
import { mediatorChannelEnum } from "./enums/mediatorChannelEnum";
import { ICacheRepository } from "./interfaces/ICacheRepository";
import { IMediator } from "./interfaces/IMediator";
import { IRepository } from "./interfaces/IRepository";
import { IService } from "./interfaces/IService";
import { IWSClient } from "./interfaces/IWSClient";
import { Repository } from "./Repository";

export class CacheManagementRepository<
  PERSIST extends IPersist,
  FORM extends IForm,
  CACHE extends IForm,
  FILTER,
  FILTER_TYPES extends string,
  FILTER_STATE,
  CACHE_REP extends ICacheRepository<PERSIST, FORM, CACHE, FILTER, FILTER_TYPES, FILTER_STATE>,
  S extends IService<PERSIST>,
  WS extends IWSClient = IWSClient,
  ME extends IMediator = IMediator
> extends Repository<PERSIST, S> implements IRepository<PERSIST> {
  protected cacheRepository: CACHE_REP;

  constructor(
    Persist: { new (data?: any): PERSIST },
    service: S,
    ws: WS,
    channelName: string,
    mediator: ME,
    cacheRepository: CACHE_REP,
  ) {
    super(Persist, service, ws, channelName, mediator);

    this.cacheRepository = cacheRepository;
  }

  public async init(): Promise<void> {
    await super.init();

    this.mediator.emit(mediatorChannelEnum.init_repository, this);
  }

  public async create(data: object): Promise<PERSIST | void> {
    const result: PERSIST | void = await super.create(data);

    if (result instanceof this.Persist) {
      this.cacheRepository.create(result);
    }

    return result;
  }

  public async update(data: object): Promise<PERSIST | void> {
    const result: PERSIST | void = await super.update(data);

    if (result instanceof this.Persist) {
      this.cacheRepository.update(result);
    }

    return result;
  }

  public async remove(id: string): Promise<PERSIST | void> {
    const result: PERSIST | void = await super.remove(id);

    if (result instanceof this.Persist) {
      this.cacheRepository.remove(id);
    }

    return result;
  }

  public receiveMessage([channelName, payload]: [string, any]): void {
    const result: PERSIST | PERSIST[] | void = super.receiveMessage([channelName, payload]);

    if (this.isInit) {
      if (this.channelName === channelName) {
        if (isObject(payload.create) && result instanceof this.Persist) {
          this.cacheRepository.create(result);
        }

        if (isArray(payload.bulkCreate) && isArray(result)) {
          for (const item of result) {
            this.cacheRepository.create(item);
          }
        }

        if (isObject(payload.update) && result instanceof this.Persist) {
          this.cacheRepository.update(result);
        }

        if (isArray(payload.bulkUpdate) && isArray(result)) {
          for (const item of result) {
            this.cacheRepository.update(item);
          }
        }

        if (isObject(payload.remove) && result instanceof this.Persist) {
          this.cacheRepository.remove(result.id);
        }
      }
    }
  }
}

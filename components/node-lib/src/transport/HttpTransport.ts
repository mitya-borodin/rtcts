/* eslint-disable @typescript-eslint/no-explicit-any */
import { Entity, User, UserData } from "@rtcts/isomorphic";
import Koa from "koa";
import { getAuthenticateMiddleware } from "../app/auth";
import { Model } from "../model/Model";
import { Channels } from "../webSocket/Channels";
import { BaseHttpTransport, BaseHttpTransportACL } from "./BaseHttpTransport";

export interface HttpTransportACL extends BaseHttpTransportACL {
  readonly getList: string[];
  readonly getItem: string[];
  readonly create: string[];
  readonly remove: string[];
  readonly update: string[];
}

export class HttpTransport<
  MODEL extends Model<ENTITY, DATA, VA>,
  ENTITY extends Entity<DATA, VA>,
  DATA,
  VA extends object,
  USER extends User<USER_DATA, USER_VA>,
  USER_DATA extends UserData = UserData,
  USER_VA extends object = object,
  CHANNELS extends Channels = Channels
> extends BaseHttpTransport<USER, USER_DATA, USER_VA, CHANNELS> {
  protected readonly Entity: new (data: Partial<DATA>) => ENTITY;
  protected readonly model: MODEL;
  protected readonly ACL: HttpTransportACL;
  protected readonly switchers: {
    readonly getList: boolean;
    readonly getItem: boolean;
    readonly create: boolean;
    readonly update: boolean;
    readonly remove: boolean;
    readonly channel: boolean;
  };

  constructor(
    name: string,
    Entity: new (data?: any) => ENTITY,
    model: MODEL,
    channels: CHANNELS,
    ACL: HttpTransportACL,
    switchers: {
      getList: boolean;
      getItem: boolean;
      create: boolean;
      update: boolean;
      remove: boolean;
      channel: boolean;
    } = {
      getList: true,
      getItem: true,
      create: true,
      update: true,
      remove: true,
      channel: true,
    },
    User: new (data?: any) => USER,
  ) {
    super(name, channels, ACL, switchers, User);

    this.Entity = Entity;
    this.model = model;

    this.getList();
    this.getItem();
    this.create();
    this.update();
    this.remove();
  }

  protected getList(): void {
    const URL = `${this.basePath}`;

    this.router.get(
      URL,
      getAuthenticateMiddleware(),
      async (ctx: Koa.Context): Promise<void> => {
        await this.executor(ctx, URL, this.ACL.getList, this.switchers.getList, async () => {
          const listResponse = await this.model.getListResponse(ctx.query.offset, ctx.query.limit);

          ctx.status = 200;
          ctx.type = "application/json";
          ctx.body = JSON.stringify(listResponse);
        });
      },
    );
  }

  protected getItem(): void {
    const URL = `${this.basePath}/:id`;

    this.router.get(
      URL,
      getAuthenticateMiddleware(),
      async (ctx: Koa.Context): Promise<void> => {
        await this.executor(ctx, URL, this.ACL.getItem, this.switchers.getItem, async () => {
          const { id } = ctx.params;
          const response = await this.model.getItemResponse(id);

          if (response.result) {
            ctx.status = 200;
            ctx.type = "application/json";
            ctx.body = JSON.stringify(response);
          } else {
            const message = `[ ${this.constructor.name} ][ ${URL} ][ MODEL_NOT_FOUND_BY_ID: ${id} ]`;

            ctx.throw(message, 404);
          }
        });
      },
    );
  }

  protected create(): void {
    const URL = `${this.basePath}`;

    this.router.put(
      URL,
      getAuthenticateMiddleware(),
      async (ctx: Koa.Context): Promise<void> => {
        await this.executor(
          ctx,
          URL,
          this.ACL.create,
          this.switchers.create,
          async (userId: string, wsid: string) => {
            const response = await this.model.createResponse(ctx.request.body, userId, wsid);

            if (response.result) {
              ctx.status = 200;
              ctx.type = "application/json";
              ctx.body = JSON.stringify(response);
            } else {
              throw new Error("The model wasn't created");
            }
          },
        );
      },
    );
  }

  protected update(): void {
    const URL = `${this.basePath}`;

    this.router.post(
      URL,
      getAuthenticateMiddleware(),
      async (ctx: Koa.Context): Promise<void> => {
        await this.executor(
          ctx,
          URL,
          this.ACL.update,
          this.switchers.update,
          async (userId: string, wsid: string) => {
            const response = await this.model.updateResponse(ctx.request.body, userId, wsid);

            if (response.result) {
              ctx.status = 200;
              ctx.type = "application/json";
              ctx.body = JSON.stringify(response);
            } else {
              throw new Error("The model wasn't updated");
            }
          },
        );
      },
    );
  }

  protected remove(): void {
    const URL = `${this.basePath}`;

    this.router.delete(
      URL,
      getAuthenticateMiddleware(),
      async (ctx: Koa.Context): Promise<void> => {
        await this.executor(
          ctx,
          URL,
          this.ACL.remove,
          this.switchers.remove,
          async (userId: string, wsid: string) => {
            const { id } = ctx.request.body;
            const response = await this.model.removeResponse(id, userId, wsid);

            if (response.result) {
              ctx.status = 200;
              ctx.type = "application/json";
              ctx.body = JSON.stringify(response);
            } else {
              const message = `[ ${this.constructor.name} ][ ${URL} ][ MODEL_NOT_FOUND_BY_ID: ${ctx.request.body.id} ]`;

              ctx.throw(message, 404);
            }
          },
        );
      },
    );
  }
}

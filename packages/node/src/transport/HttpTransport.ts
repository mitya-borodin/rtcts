import { Entity, User } from "@rtcts/isomorphic";
import Koa from "koa";
import { getAuthenticateMiddleware } from "../app/auth";
import { getRequestBodyJson } from "../app/getRequestBodyJson";
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
  MODEL extends Model<ENTITY>,
  ENTITY extends Entity,
  USER extends User,
  CHANNELS extends Channels = Channels
> extends BaseHttpTransport<USER, CHANNELS> {
  protected readonly Entity: new (data: any) => ENTITY;
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

    this.ACL = ACL;
    this.switchers = switchers;

    this.Entity = Entity;
    this.model = model;

    this.getList();
    this.getItem();
    this.create();
    this.update();
    this.remove();
  }

  protected getList = (): void => {
    const URL = `${this.basePath}/list`;

    this.router.get(
      URL,
      getAuthenticateMiddleware(),
      async (ctx: Koa.Context): Promise<void> => {
        await this.executor(ctx, URL, this.ACL.getList, this.switchers.getList, async () => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          const listResponse = await this.model.getListResponse(ctx.query.offset, ctx.query.limit);

          ctx.status = 200;
          ctx.type = "application/json";
          ctx.body = JSON.stringify(listResponse);
        });
      },
    );
  };

  protected getItem = (): void => {
    const URL = `${this.basePath}/item/:id`;

    this.router.get(
      URL,
      getAuthenticateMiddleware(),
      async (ctx: Koa.Context): Promise<void> => {
        await this.executor(ctx, URL, this.ACL.getItem, this.switchers.getItem, async () => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const { id } = ctx.params;
          const response = await this.model.getItemResponse(id);

          if (response.payload) {
            ctx.status = 200;
            ctx.type = "application/json";
            ctx.body = JSON.stringify(response);
          } else {
            const message = `[ ${this.constructor.name} ][ ${URL} ][ MODEL_NOT_FOUND_BY_ID: ${id} ]`;

            ctx.throw(404, message);
          }
        });
      },
    );
  };

  protected create(): void {
    const URL = `${this.basePath}/create`;

    this.router.put(
      URL,
      getAuthenticateMiddleware(),
      getRequestBodyJson(),
      async (ctx: Koa.Context): Promise<void> => {
        await this.executor(
          ctx,
          URL,
          this.ACL.create,
          this.switchers.create,
          async (userId: string, wsid: string) => {
            const response = await this.model.createResponse(ctx.request.body, userId, wsid);

            if (response.payload) {
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
    const URL = `${this.basePath}/update`;

    this.router.post(
      URL,
      getAuthenticateMiddleware(),
      getRequestBodyJson(),
      async (ctx: Koa.Context): Promise<void> => {
        await this.executor(
          ctx,
          URL,
          this.ACL.update,
          this.switchers.update,
          async (userId: string, wsid: string) => {
            const response = await this.model.updateResponse(ctx.request.body, userId, wsid);

            if (response.payload) {
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
    const URL = `${this.basePath}/remove`;

    this.router.delete(
      URL,
      getAuthenticateMiddleware(),
      getRequestBodyJson(),
      async (ctx: Koa.Context): Promise<void> => {
        await this.executor(
          ctx,
          URL,
          this.ACL.remove,
          this.switchers.remove,
          async (userId: string, wsid: string) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const { id } = ctx.request.body;
            const response = await this.model.removeResponse(id, userId, wsid);

            if (response.payload) {
              ctx.status = 200;
              ctx.type = "application/json";
              ctx.body = JSON.stringify(response);
            } else {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              const message = `[ ${this.constructor.name} ][ ${URL} ][ MODEL_NOT_FOUND_BY_ID: ${ctx.request.body.id} ]`;

              ctx.throw(404, message);
            }
          },
        );
      },
    );
  }
}

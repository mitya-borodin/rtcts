/* eslint-disable @typescript-eslint/no-explicit-any */
import { Entity } from "@rtcts/isomorphic";
import Koa from "koa";
import { getAuthenticateMiddleware } from "../app/auth";
import { Model } from "../model/Model";
import { Channels } from "../webSocket/Channels";
import { BaseHttpTransport } from "./BaseHttpTransport";

export class HttpTransport<
  E extends Entity<DATA, VA>,
  DATA,
  VA extends any[],
  M extends Model<E, DATA, VA>,
  CH extends Channels = Channels
> extends BaseHttpTransport<CH> {
  protected readonly Entity: new (data: any) => E;
  protected readonly model: M;
  protected readonly ACL: {
    readonly getList: string[];
    readonly getItem: string[];
    readonly create: string[];
    readonly remove: string[];
    readonly update: string[];
    readonly channel: string[];
  };
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
    Entity: new (data: any) => E,
    model: M,
    channels: CH,
    ACL: {
      getList: string[];
      getItem: string[];
      create: string[];
      update: string[];
      remove: string[];
      channel: string[];
    },
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
  ) {
    super(name, channels, ACL, switchers);

    this.Entity = Entity;
    this.model = model;

    this.getList();
    this.getItem();
    this.create();
    this.update();
    this.remove();
  }

  protected getList(): void {
    const URL = `/${this.name}`;

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
    const URL = `/${this.name}/:id`;

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
    const URL = `/${this.name}`;

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
            const response = await this.model.createResponse(ctx.body, userId, wsid);

            if (response.result) {
              ctx.status = 200;
              ctx.type = "application/json";
              ctx.body = JSON.stringify(response);
            } else {
              throw new Error("The model is not creating");
            }
          },
        );
      },
    );
  }

  protected update(): void {
    const URL = `/${this.name}`;

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
            const response = await this.model.updateResponse(ctx.body, userId, wsid);

            if (response.result) {
              ctx.status = 200;
              ctx.type = "application/json";
              ctx.body = JSON.stringify(response);
            } else {
              throw new Error("The model is not updating");
            }
          },
        );
      },
    );
  }

  protected remove(): void {
    const URL = `/${this.name}`;

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
            const { id } = ctx.body;
            const response = await this.model.removeResponse(id, userId, wsid);

            if (response.result) {
              ctx.status = 200;
              ctx.type = "application/json";
              ctx.body = JSON.stringify(response);
            } else {
              const message = `[ ${this.constructor.name} ][ ${URL} ][ MODEL_NOT_FOUND_BY_ID: ${ctx.body.id} ]`;

              ctx.throw(message, 404);
            }
          },
        );
      },
    );
  }
}

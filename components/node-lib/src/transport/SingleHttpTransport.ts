/* eslint-disable @typescript-eslint/no-explicit-any */
import { Entity } from "@rtcts/isomorphic";
import Koa from "koa";
import { getAuthenticateMiddleware } from "../app/auth";
import { Model } from "../model/Model";
import { Channels } from "../webSocket/Channels";
import { BaseHttpTransport, BaseHttpTransportACL } from "./BaseHttpTransport";

export interface SingleHttpTransportACL extends BaseHttpTransportACL {
  readonly getList: string[];
  readonly update: string[];
}

export class SingleHttpTransport<
  E extends Entity<DATA, VA>,
  DATA,
  VA extends any[],
  M extends Model<E, DATA, VA>,
  CH extends Channels = Channels
> extends BaseHttpTransport<CH> {
  protected readonly Entity: new (data: any) => E;
  protected readonly model: M;
  protected readonly ACL: SingleHttpTransportACL;
  protected readonly switchers: {
    readonly getList: boolean;
    readonly update: boolean;
    readonly channel: boolean;
  };

  constructor(
    name: string,
    Entity: new (data: any) => E,
    model: M,
    channels: CH,
    ACL: SingleHttpTransportACL,
    switchers: {
      getList: boolean;
      update: boolean;
      channel: boolean;
    } = {
      getList: true,
      update: true,
      channel: true,
    },
  ) {
    super(name, channels, ACL, switchers);

    this.Entity = Entity;
    this.model = model;

    this.getList();
    this.update();
  }

  protected getList(): void {
    const URL = `/${this.name}`;

    this.router.get(
      URL,
      getAuthenticateMiddleware(),
      async (ctx: Koa.Context): Promise<void> => {
        await this.executor(ctx, URL, this.ACL.getList, this.switchers.getList, async () => {
          const listResponse = await this.model.getListResponse(ctx.query.offset, ctx.query.limit);

          if (listResponse.results.length > 0) {
            ctx.status = 200;
            ctx.type = "application/json";
            ctx.body = JSON.stringify(listResponse);
          } else {
            const message = `[ ${this.constructor.name} ][ ${URL} ][ MODELS_NOT_FOUND ]`;

            ctx.throw(message, 404);
          }
        });
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
              throw new Error("The model wasn't updated");
            }
          },
        );
      },
    );
  }
}

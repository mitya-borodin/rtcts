import { Entity } from "@rtcts/isomorphic";
import Koa from "koa";
import { getAuthenticateMiddleware } from "../app/auth";
import { Model } from "../model/Model";
import { Channels } from "../webSocket/Channels";
import { BaseHttpTransport } from "./BaseHttpTransport";

export class SingleHttpTransport<
  E extends Entity<DATA, VA>,
  DATA,
  VA extends any[],
  M extends Model<E, DATA, VA>,
  CH extends Channels = Channels
> extends BaseHttpTransport<CH> {
  protected readonly Entity: new (data: any) => E;
  protected readonly model: M;
  protected readonly ACL: {
    readonly read: string[];
    readonly update: string[];
    readonly channel: string[];
  };
  protected readonly switchers: {
    readonly read: boolean;
    readonly update: boolean;
    readonly channel: boolean;
  };

  constructor(
    name: string,
    Entity: new (data: any) => E,
    model: M,
    channels: CH,
    ACL: {
      read: string[];
      update: string[];
      channel: string[];
    },
    switchers: {
      read: boolean;
      update: boolean;
      channel: boolean;
    } = {
      read: true,
      update: true,
      channel: true,
    },
  ) {
    super(name, channels, ACL, switchers);

    this.Entity = Entity;
    this.model = model;

    this.read();
    this.update();
  }

  protected read(): void {
    const URL = `/${this.name}/read`;

    this.router.get(
      URL,
      getAuthenticateMiddleware(),
      async (ctx: Koa.Context): Promise<void> => {
        await this.executor(ctx, URL, this.ACL.read, this.switchers.read, async () => {
          const entity: E[] | null = await this.model.read();

          if (entity && entity.length > 0) {
            ctx.status = 200;
            ctx.type = "application/json";
            ctx.body = JSON.stringify(entity[0].toObject());
          } else {
            const message = `[ ${this.constructor.name} ][ ${URL} ][ MODELS_NOT_FOUND ]`;

            ctx.throw(message, 404);
          }
        });
      },
    );
  }

  protected update(): void {
    const URL = `/${this.name}/update`;

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
            const entity: E | null = await this.model.update(ctx.body, userId, wsid);

            if (entity) {
              ctx.status = 200;
              ctx.type = "application/json";
              ctx.body = JSON.stringify(entity.toObject());
            } else {
              throw new Error("The model is not updating");
            }
          },
        );
      },
    );
  }
}

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
    readonly collection: string[];
    readonly read: string[];
    readonly create: string[];
    readonly remove: string[];
    readonly update: string[];
    readonly channel: string[];
  };
  protected readonly switchers: {
    readonly collection: boolean;
    readonly create: boolean;
    readonly read: boolean;
    readonly remove: boolean;
    readonly update: boolean;
    readonly channel: boolean;
  };

  constructor(
    name: string,
    Entity: new (data: any) => E,
    model: M,
    channels: CH,
    ACL: {
      collection: string[];
      create: string[];
      read: string[];
      remove: string[];
      update: string[];
      channel: string[];
    },
    switchers: {
      collection: boolean;
      create: boolean;
      read: boolean;
      remove: boolean;
      update: boolean;
      channel: boolean;
    } = {
      collection: true,
      create: true,
      read: true,
      remove: true,
      update: true,
      channel: true,
    },
  ) {
    super(name, channels, ACL, switchers);

    this.Entity = Entity;
    this.model = model;

    this.collection();
    this.read();
    this.create();
    this.update();
    this.remove();
  }

  protected collection(): void {
    const URL = `/${this.name}/collection`;

    this.router.get(
      URL,
      getAuthenticateMiddleware(),
      async (ctx: Koa.Context): Promise<void> => {
        await this.executor(ctx, URL, this.ACL.collection, this.switchers.collection, async () => {
          const collection = await this.model.read({});

          ctx.status = 200;
          ctx.type = "application/json";
          ctx.body = JSON.stringify(collection.map((item) => item.toObject()));
        });
      },
    );
  }

  protected read(): void {
    const URL = `/${this.name}/read`;

    this.router.get(
      URL,
      getAuthenticateMiddleware(),
      async (ctx: Koa.Context): Promise<void> => {
        await this.executor(ctx, URL, this.ACL.read, this.switchers.read, async () => {
          const { id } = ctx.query;
          const entity: E | null = await this.model.readById(id);

          if (entity) {
            ctx.status = 200;
            ctx.type = "application/json";
            ctx.body = JSON.stringify(entity.toObject());
          } else {
            const message = `[ ${this.constructor.name} ][ ${URL} ][ MODEL_NOT_FOUND_BY_ID: ${id} ]`;

            ctx.throw(message, 404);
          }
        });
      },
    );
  }

  protected create(): void {
    const URL = `/${this.name}/create`;

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
            const entity: E | null = await this.model.create(ctx.body, userId, wsid);

            if (entity) {
              ctx.status = 200;
              ctx.type = "application/json";
              ctx.body = JSON.stringify(entity.toObject());
            } else {
              throw new Error("The model is not creating");
            }
          },
        );
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

  protected remove(): void {
    const URL = `/${this.name}/remove`;

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
            const entity: E | null = await this.model.remove(id, userId, wsid);

            if (entity) {
              ctx.status = 200;
              ctx.type = "application/json";
              ctx.body = JSON.stringify(entity.toObject());
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

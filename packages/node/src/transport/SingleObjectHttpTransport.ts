/* eslint-disable @typescript-eslint/no-explicit-any */
import { Entity, User } from "@rtcts/isomorphic";
import Koa from "koa";
import { getAuthenticateMiddleware } from "../app/auth";
import { getRequestBodyJson } from "../app/getRequestBodyJson";
import { SingleObjectModel } from "../model/SingleObjectModel";
import { Channels } from "../webSocket/Channels";
import { BaseHttpTransport, BaseHttpTransportACL } from "./BaseHttpTransport";

export interface SingleObjectHttpTransportACL extends BaseHttpTransportACL {
  readonly getItem: string[];
  readonly update: string[];
}

export class SingleObjectHttpTransport<
  MODEL extends SingleObjectModel<ENTITY>,
  ENTITY extends Entity,
  USER extends User,
  CH extends Channels = Channels
> extends BaseHttpTransport<USER, CH> {
  protected readonly Entity: new (data?: any) => ENTITY;
  protected readonly model: MODEL;
  protected readonly ACL: SingleObjectHttpTransportACL;
  protected readonly switchers: {
    readonly getItem: boolean;
    readonly update: boolean;
    readonly channel: boolean;
  };

  constructor(
    name: string,
    Entity: new (data?: any) => ENTITY,
    model: MODEL,
    channels: CH,
    ACL: SingleObjectHttpTransportACL,
    switchers: {
      getItem: boolean;
      update: boolean;
      channel: boolean;
    } = {
      getItem: true,
      update: true,
      channel: true,
    },
    User: new (data?: any) => USER,
  ) {
    super(name, channels, ACL, switchers, User);

    this.ACL = ACL;
    this.switchers = switchers;

    this.Entity = Entity;
    this.model = model;

    this.getItem();
    this.update();
  }

  protected getItem = (): void => {
    const URL = `${this.basePath}/item`;

    this.router.get(
      URL,
      getAuthenticateMiddleware(),
      async (ctx: Koa.Context): Promise<void> => {
        await this.executor(ctx, URL, this.ACL.getItem, this.switchers.getItem, async () => {
          const response = await this.model.getItemResponse();

          if (response.payload) {
            ctx.status = 200;
            ctx.type = "application/json";
            ctx.body = JSON.stringify(response);
          } else {
            const message = `[ ${this.constructor.name} ][ ${URL} ][ MODELS_NOT_FOUND ]`;

            ctx.throw(404, message);
          }
        });
      },
    );
  };

  protected update = (): void => {
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
  };
}

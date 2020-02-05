/* eslint-disable @typescript-eslint/no-explicit-any */
import { User, UserData } from "@rtcts/isomorphic";
import { getErrorMessage } from "@rtcts/utils";
import Koa from "koa";
import Router from "koa-router";
import { getAuthenticateMiddleware } from "../app/auth";
import { Channels } from "../webSocket/Channels";

export interface BaseHttpTransportACL {
  readonly channel: string[];
}

export abstract class BaseHttpTransport<
  USER extends User<USER_DATA, USER_VA>,
  USER_DATA extends UserData = UserData,
  USER_VA extends object = object,
  CHANNELS extends Channels = Channels
> {
  protected readonly name: string;
  protected readonly channels: CHANNELS;
  protected readonly ACL: BaseHttpTransportACL;
  protected readonly switchers: {
    readonly channel: boolean;
  };
  protected readonly router: Router;

  protected readonly User: new (data?: any) => USER;

  constructor(
    name: string,
    channels: CHANNELS,
    ACL: BaseHttpTransportACL,
    switchers: {
      channel: boolean;
    } = {
      channel: true,
    },
    User: new (data?: any) => USER,
  ) {
    this.name = name;
    this.channels = channels;
    this.ACL = ACL;
    this.switchers = switchers;
    this.router = new Router();
    this.User = User;

    this.channel();
  }

  public getRouter(): Router {
    return this.router;
  }

  protected channel(): void {
    const URL = `/${this.name}/channel`;

    this.router.post(
      URL,
      getAuthenticateMiddleware(),
      async (ctx: Koa.Context): Promise<void> => {
        await this.executor(
          ctx,
          URL,
          this.ACL.channel,
          this.switchers.channel,
          async (userId: string, wsid: string) => {
            const { action, channelName } = ctx.body;

            if (action === "on") {
              this.channels.on(channelName, userId, wsid);

              ctx.status = 200;
              ctx.type = "text/plain";
              ctx.body = "";
            } else if (action === "off") {
              this.channels.off(channelName, userId, wsid);

              ctx.status = 200;
              ctx.type = "text/plain";
              ctx.body = "";
            } else {
              const message = `[ ${this.constructor.name} ][ ${URL} ][ UNEXPECTED ACTION: ${action} ]`;

              ctx.throw(message, 404);
            }
          },
        );
      },
    );
  }

  protected async executor(
    ctx: Koa.Context,
    URL: string,
    ACL: string[],
    switcher: boolean,
    worker: (userId: string, wsid: string) => Promise<void>,
  ): Promise<void> {
    if (switcher) {
      try {
        // ! ctx.state.user - provided by getAuthenticateStrategyMiddleware
        // ! components/node-lib/src/app/auth.ts
        const user = ctx.state.user;

        // ! ctx.body.wsid -  provided by webSocketMiddleware -> { ctx.body.wsid = ctx.headers["x-ws-id"]; }
        // ! components/node-lib/src/webSocket/webSocketMiddleware.ts
        const { wsid } = ctx.body;

        if (
          user instanceof this.User &&
          // ! I should set UserData because I need to use concrete type
          user.isEntity<UserData>() &&
          (ACL.length === 0 || ACL.includes(user.group))
        ) {
          return await worker(user.id, wsid);
        }

        ctx.throw(`Access denied (${this.constructor.name})(${URL}) for ${user.group}`, 403);
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        const message = `[ ${this.constructor.name} ][ ${URL} ][ ${errorMessage} ]`;

        ctx.throw(message, 500);
      }
    } else {
      ctx.throw(404);
    }
  }
}

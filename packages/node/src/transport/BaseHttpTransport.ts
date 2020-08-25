import { Response, User, ValidationResult, Validation, logTypeEnum } from "@rtcts/isomorphic";
import { getErrorMessage } from "@rtcts/utils";
import Koa from "koa";
import koaLogger from "koa-logger";
import Router from "koa-router";
import { getAuthenticateMiddleware } from "../app/auth";
import { getRequestBodyJson } from "../app/getRequestBodyJson";
import { Channels } from "../webSocket/Channels";

export interface BaseHttpTransportACL {
  readonly channel: string[];
}

export abstract class BaseHttpTransport<USER extends User, CHANNELS extends Channels = Channels> {
  protected readonly name: string;
  protected readonly channels: CHANNELS;
  protected readonly ACL: BaseHttpTransportACL;
  protected readonly switchers: {
    readonly channel: boolean;
  };
  protected readonly router: Router;

  protected readonly User: new (data?: { [key: string]: any }) => USER;
  protected readonly root: string;
  protected readonly webSocketIdHeaderKey: string;

  constructor(
    name: string,
    channels: CHANNELS,
    ACL: BaseHttpTransportACL,
    switchers: {
      channel: boolean;
    } = {
      channel: true,
    },
    User: new (data?: { [key: string]: any }) => USER,
    root = "/api",
    webSocketIdHeaderKey = "x-ws-id",
  ) {
    this.name = name;
    this.channels = channels;
    this.ACL = ACL;
    this.switchers = switchers;
    this.router = new Router();
    this.User = User;
    this.root = root;
    this.webSocketIdHeaderKey = webSocketIdHeaderKey;

    this.router.use(koaLogger());
    this.router.use(async (ctx: Koa.Context, next: Koa.Next) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      ctx.request.wsid = ctx.headers[this.webSocketIdHeaderKey];

      await next();
    });

    this.channel();
  }

  public getRouter = (): Router => {
    return this.router;
  };

  public setMiddleware = (middleware: Koa.Middleware): void => {
    this.router.use(middleware);
  };

  protected get basePath(): string {
    return `${this.root}/${this.name}`;
  }

  protected channel(): void {
    const URL = `${this.basePath}/channel`;

    this.router.post(
      URL,
      getAuthenticateMiddleware(),
      getRequestBodyJson(),
      async (ctx: Koa.Context): Promise<void> => {
        await this.executor(
          ctx,
          URL,
          this.ACL.channel,
          this.switchers.channel,
          (userId: string, wsid: string) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const { action, channelName } = ctx.request.body;

            if (action === "on") {
              this.channels.on(channelName, userId, wsid);

              ctx.status = 200;
              ctx.type = "application/json";
              ctx.body = new Response({
                payload: {},
                validationResult: new ValidationResult([]),
              });
            } else if (action === "off") {
              this.channels.off(channelName, userId, wsid);

              ctx.status = 200;
              ctx.type = "application/json";
              ctx.body = new Response({
                payload: {},
                validationResult: new ValidationResult([]),
              });
            } else {
              const message = `[ ${this.constructor.name} ][ ${URL} ][ UNEXPECTED ACTION: ${action} ]`;

              ctx.throw(404, message);
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
    worker: (userId: string, wsid: string) => Promise<void> | void,
  ): Promise<void> {
    if (switcher) {
      try {
        // ! ctx.request.user - provided by getAuthenticateStrategyMiddleware
        // ! components/node-lib/src/app/auth.ts
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const { wsid, user } = ctx.request;

        if (
          user instanceof this.User &&
          // ! I should set UserData because I need to use concrete type
          user.isEntity() &&
          (ACL.length === 0 || ACL.includes(user.group))
        ) {
          return await worker(user.id, wsid);
        }

        ctx.throw(
          403,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          `Access denied (${this.constructor.name})(${URL}) for ${String(user.group)}`,
        );
      } catch (error) {
        ctx.status = 500;
        ctx.type = "application/json";
        ctx.body = JSON.stringify(
          new Response({
            payload: { error },
            validationResult: new ValidationResult([
              new Validation({
                type: logTypeEnum.error,
                message: getErrorMessage(error),
              }),
            ]),
          }),
        );
      }
    } else {
      ctx.throw(
        404,
        `[ executor ][ URL: ${URL} ][ ACL: ${ACL.join(", ")} ][ switcher: ${switcher} ][ 404 ]`,
      );
    }
  }

  protected send(ctx: Koa.Context, response: Response): boolean {
    if (response.validationResult.hasError) {
      ctx.status = 500;
      ctx.type = "application/json";
      ctx.body = JSON.stringify(response);

      return false;
    }

    if (response.payload) {
      ctx.status = 200;
      ctx.type = "application/json";
      ctx.body = JSON.stringify(response);

      return false;
    }

    return true;
  }
}

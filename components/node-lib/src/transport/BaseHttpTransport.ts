/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response, User, UserData, ValidateResult } from "@rtcts/isomorphic";
import { getErrorMessage, isNumber } from "@rtcts/utils";
import body from "co-body";
import fs from "fs";
import Koa from "koa";
import koaCompress from "koa-compress";
import koaLogger from "koa-logger";
import Router from "koa-router";
import path from "path";
import typeIs from "type-is";
import { promisify } from "util";
import { getAuthenticateMiddleware } from "../app/auth";
import { Channels } from "../webSocket/Channels";
import { SizeControllerStream } from "./SizeControllerStream";

const exists = promisify(fs.exists);
const stat = promisify(fs.stat);

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
    User: new (data?: any) => USER,
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

    this.router.use(koaCompress());
    this.router.use(koaLogger());
    this.router.use(async (ctx: Koa.Context, next: Koa.Next) => {
      try {
        ctx.request.wsid = ctx.headers[this.webSocketIdHeaderKey];
        ctx.request.body = {};

        if (typeIs(ctx.req, ["application/json"])) {
          ctx.request.body = await body.json(ctx);
        }

        await next();
      } catch (error) {
        ctx.throw(500, error);
      }
    });

    this.channel();
  }

  public getRouter(): Router {
    return this.router;
  }

  public setMiddleware(middleware: Koa.Middleware): void {
    this.router.use(middleware);
  }

  protected get basePath(): string {
    return `${this.root}/${this.name}`;
  }

  protected channel(): void {
    const URL = `${this.basePath}/channel`;

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
            const { action, channelName } = ctx.request.body;

            if (action === "on") {
              this.channels.on(channelName, userId, wsid);

              ctx.status = 200;
              ctx.type = "application/json";
              ctx.body = new Response({
                result: {},
                validates: new ValidateResult(),
              });
            } else if (action === "off") {
              this.channels.off(channelName, userId, wsid);

              ctx.status = 200;
              ctx.type = "application/json";
              ctx.body = new Response({
                result: {},
                validates: new ValidateResult(),
              });
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
        // ! ctx.request.user - provided by getAuthenticateStrategyMiddleware
        // ! components/node-lib/src/app/auth.ts
        const { wsid, user } = ctx.request;

        if (
          user instanceof this.User &&
          // ! I should set UserData because I need to use concrete type
          user.isEntity<UserData>() &&
          (ACL.length === 0 || ACL.includes(user.group))
        ) {
          return await worker(user.id, wsid);
        }

        ctx.throw(403, `Access denied (${this.constructor.name})(${URL}) for ${user.group}`);
      } catch (error) {
        ctx.throw(
          500,
          `[ ${this.constructor.name} ][ URL: ${URL} ][ ACL: ${ACL} ]` +
            `[ switcher: ${switcher} ][ ${getErrorMessage(error)} ][ 500 ]`,
        );
      }
    } else {
      ctx.throw(404, `[ executor ][ URL: ${URL} ][ ACL: ${ACL} ][ switcher: ${switcher} ][ 404 ]`);
    }
  }

  protected async downloadFile(ctx: Koa.Context, sourceFilePath: string): Promise<void> {
    if (!(await exists(sourceFilePath))) {
      ctx.throw(`Source file (${sourceFilePath}) isn't exist`, 500);
    }

    const fileStat = await stat(sourceFilePath);

    ctx.res.setHeader("Content-Length", fileStat.size);

    return new Promise((resolve, reject) => {
      // ! Request
      ctx.req.on("error", (error: Error): void => {
        reject(error);
      });

      ctx.req.on("abort", () => {
        reject(new Error("Request has been aborted by the client."));
      });

      ctx.req.on("aborted", () => {
        reject(new Error("Request has been aborted."));
      });

      // ! Response
      ctx.res.on("error", (error: Error): void => {
        reject(error);
      });

      ctx.res.on("finish", () => {
        resolve();
      });

      const sourceStream = fs.createReadStream(sourceFilePath);

      sourceStream.on("error", (error: Error): void => {
        reject(error);
      });

      sourceStream.pipe(ctx.res);
    });
  }

  protected async uploadFile(
    ctx: Koa.Context,
    destinationDirectory: string,
    fileName: string,
    config = {
      maxFileSize: 10 * 1024 * 1024, // 10 mb
      mimeTypes: [
        "image/gif",
        "image/jpeg",
        "image/pjpeg",
        "image/png",
        "image/webp",
        "image/heic",
      ],
    },
  ): Promise<void> {
    if (!(await exists(destinationDirectory))) {
      ctx.throw(`Destination directory (${destinationDirectory}) isn't exist`, 500);
    }

    if (await exists(path.resolve(destinationDirectory, fileName))) {
      ctx.throw(`File (${fileName}) already exist in (${destinationDirectory})`, 500);
    }

    // * Getting Headers
    const contentLength = parseInt(ctx.req.headers["content-length"] || "0");
    const mimeType = ctx.req.headers["content-type"];

    if (!isNumber(contentLength) || (isNumber(contentLength) && contentLength === 0)) {
      ctx.throw(`Content-Light must be Number and more then zero`, 500);
    }

    if (contentLength > config.maxFileSize) {
      ctx.throw(
        `Content-Light (${contentLength}) more then max file size (${config.maxFileSize})`,
        413,
      );
    }

    if (!typeIs(ctx.req, config.mimeTypes)) {
      ctx.throw(`Mime type (${mimeType}) does not match valid values (${config.mimeTypes})`, 422);
    }

    return new Promise((resolve, reject) => {
      ctx.req.on("error", (error: Error): void => {
        reject(error);
      });

      ctx.res.on("error", (error: Error): void => {
        reject(error);
      });

      ctx.req.on("abort", () => {
        reject(new Error("Request has been aborted by the client."));
      });

      ctx.req.on("aborted", () => {
        reject(new Error("Request has been aborted."));
      });

      // * Green Zone
      const sizeControllerStream = new SizeControllerStream();

      sizeControllerStream.on("progress", () => {
        if (sizeControllerStream.bytes > config.maxFileSize) {
          ctx.throw(
            `More data is received (${contentLength}) than is allowed (${config.maxFileSize})`,
            500,
          );
        }
      });

      const destinationStream = fs.createWriteStream(path.resolve(destinationDirectory, fileName));

      destinationStream.on("finish", () => {
        resolve();
      });

      destinationStream.on("error", (error: Error): void => {
        reject(error);
      });

      ctx.req.pipe(sizeControllerStream).pipe(destinationStream);
    });
  }
}

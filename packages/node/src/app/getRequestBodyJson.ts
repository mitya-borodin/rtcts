import body from "co-body";
import { Context, Middleware, Next } from "koa";

export const getRequestBodyJson = (): Middleware => {
  return async (ctx: Context, next: Next): Promise<void> => {
    ctx.request.body = {};

    if (ctx.is("application/json")) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      ctx.request.body = await body.json(ctx);
    }

    await next();
  };
};

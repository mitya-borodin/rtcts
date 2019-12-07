import Koa from "koa";

export async function webSocketMiddleware(ctx: Koa.Context, next: Koa.Next): Promise<void> {
  ctx.body.wsid = ctx.headers["x-ws-id"];

  await next();
}

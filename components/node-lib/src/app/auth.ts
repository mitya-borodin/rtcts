import { User } from "@rtcts/isomorphic";
import jwt from "jsonwebtoken";
import Koa from "koa";
import ms from "ms";
import { isString } from "util";
import { UserModel } from "../model/UserModel";
import { Config } from "./Config";

export const setCookieForAuthenticate = (ctx: Koa.Context, token: string) => {
  ctx.cookies.set("jwt", token, { maxAge: ms("12h"), signed: true, secure: true, httpOnly: true });
};

export const getAuthenticateStrategyMiddleware = <
  C extends Config = Config,
  UE extends User = User,
  M extends UserModel<UE> = UserModel<UE>
>(
  config: C,
  userModel: M,
): Koa.Middleware => {
  return async (ctx: Koa.Context, next: Koa.Next): Promise<void> => {
    const token = ctx.cookies.get("jwt", { signed: true });

    ctx.state.user = null;

    if (isString(token)) {
      const userId = jwt.verify(token, config.jwt.secretKey, { maxAge: "12h" });

      if (isString(userId)) {
        const user: UE | null = await userModel.readById(userId);

        if (user) {
          ctx.state.user = user;

          return await next();
        }
      }
    }

    await next();
  };
};

export const getAuthenticateMiddleware = (): Koa.Middleware => {
  return async (ctx: Koa.Context, next: Koa.Next): Promise<void> => {
    if (ctx.state.user !== null) {
      return await next();
    }

    ctx.throw(403);
  };
};

import { User, UserData } from "@rtcts/isomorphic";
import jwt from "jsonwebtoken";
import Koa from "koa";
import ms from "ms";
import { UserModel } from "../model/UserModel";
import { Config } from "./Config";
import { isObject, isString } from "@rtcts/utils";

export const setCookieForAuthenticate = (ctx: Koa.Context, token: string): void => {
  ctx.cookies.set("jwt", token, { maxAge: ms("12h"), signed: true, secure: false, httpOnly: true });
};

export const unsetCookieForAuthenticate = (ctx: Koa.Context): void => {
  ctx.cookies.set("jwt", "", {
    maxAge: ms("12h"),
    signed: false,
    secure: true,
    httpOnly: true,
    overwrite: true,
  });
};

export const getAuthenticateStrategyMiddleware = <
  MODEL extends UserModel<USER, USER_DATA>,
  USER extends User<USER_DATA, VA>,
  USER_DATA extends UserData = UserData,
  VA extends object = object,
  CONFIG extends Config = Config
>(
  config: CONFIG,
  userModel: MODEL,
): Koa.Middleware => {
  return async (ctx: Koa.Context, next: Koa.Next): Promise<void> => {
    const token = ctx.cookies.get("jwt", { signed: true });

    ctx.state.user = null;

    if (isString(token)) {
      const jwtUser = jwt.verify(token, config.jwt.secretKey, { maxAge: "12h" });

      if (isObject<{ id: string }>(jwtUser) && isString(jwtUser.id)) {
        const user: USER | null = await userModel.getUserById(jwtUser.id);

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

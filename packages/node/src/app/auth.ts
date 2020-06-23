/* eslint-disable @typescript-eslint/no-explicit-any */
import { User, UserData } from "@rtcts/isomorphic";
import { isObject, isString } from "@rtcts/utils";
import jwt from "jsonwebtoken";
import Koa from "koa";
import ms from "ms";
import { UserModel } from "../model/UserModel";
import { Config } from "./Config";

export const setCookieForAuthenticate = (ctx: Koa.Context, token: string): void => {
  ctx.cookies.set("jwt", token, { maxAge: ms("12h"), httpOnly: true });
};

export const unsetCookieForAuthenticate = (ctx: Koa.Context): void => {
  ctx.cookies.set("jwt", "", {
    maxAge: ms("12h"),
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
  return async (ctx: Koa.Context, next: Koa.Next): Promise<any> => {
    const token = ctx.cookies.get("jwt");

    ctx.request.user = null;

    if (isString(token)) {
      const jwtUser = jwt.verify(token, config.jwt.secretKey, { maxAge: "12h" });

      if (isObject<{ id: string }>(jwtUser) && isString(jwtUser.id)) {
        const user: USER | null = await userModel.getUserById(jwtUser.id);

        if (user) {
          ctx.request.user = user;

          return next();
        }
      }
    }

    await next();
  };
};

export const getAuthenticateMiddleware = (): Koa.Middleware => {
  return async (ctx: Koa.Context, next: Koa.Next): Promise<any> => {
    if (ctx.request.user !== null) {
      return next();
    }

    ctx.throw(403);
  };
};

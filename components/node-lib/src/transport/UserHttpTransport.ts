/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response, User, UserData, userGroupEnum, ValidateResult } from "@rtcts/isomorphic";
import { isString } from "@rtcts/utils";
import Koa from "koa";
import {
  getAuthenticateMiddleware,
  setCookieForAuthenticate,
  unsetCookieForAuthenticate,
} from "../app/auth";
import { Config } from "../app/Config";
import { UserModel } from "../model/UserModel";
import { Channels } from "../webSocket/Channels";
import { HttpTransport, HttpTransportACL } from "./HttpTransport";

export interface UserHttpTransportACL extends HttpTransportACL {
  readonly updateLogin: string[];
  readonly updatePassword: string[];
  readonly updateGroup: string[];
  readonly signUp: string[];
  readonly signOut: string[];
}

export class UserHttpTransport<
  MODEL extends UserModel<ENTITY, DATA, VA, CONFIG>,
  ENTITY extends User<DATA, VA>,
  DATA extends UserData = UserData,
  VA extends object = object,
  CONFIG extends Config = Config,
  CHANNELS extends Channels = Channels
> extends HttpTransport<MODEL, ENTITY, DATA, VA, ENTITY, DATA, VA, CHANNELS> {
  protected readonly ACL: UserHttpTransportACL;

  protected readonly switchers: {
    readonly getList: boolean;
    readonly getItem: boolean;
    readonly create: boolean;
    readonly update: boolean;
    readonly remove: boolean;
    readonly channel: boolean;
    readonly updateLogin: boolean;
    readonly updatePassword: boolean;
    readonly updateGroup: boolean;
    readonly signUp: boolean;
    readonly signOut: boolean;
  };

  constructor(
    name: string,
    Entity: new (data?: any) => ENTITY,
    model: MODEL,
    channels: CHANNELS,
    ACL: UserHttpTransportACL = {
      getList: [userGroupEnum.admin],
      getItem: [userGroupEnum.admin],
      create: [userGroupEnum.admin],
      update: [],
      remove: [userGroupEnum.admin],
      channel: [],
      updateLogin: [userGroupEnum.admin],
      updatePassword: [userGroupEnum.admin],
      updateGroup: [userGroupEnum.admin],
      signUp: [userGroupEnum.admin],
      signOut: [userGroupEnum.admin],
    },
    switchers: {
      getList: boolean;
      getItem: boolean;
      create: boolean;
      update: boolean;
      remove: boolean;
      channel: boolean;
      updateLogin: boolean;
      updatePassword: boolean;
      updateGroup: boolean;
      signUp: boolean;
      signOut: boolean;
    } = {
      getList: true,
      getItem: false,
      create: true,
      update: true,
      remove: true,
      channel: true,
      updateLogin: true,
      updatePassword: true,
      updateGroup: true,
      signUp: true,
      signOut: true,
    },
  ) {
    super(name, Entity, model, channels, ACL, switchers, Entity);

    this.current();
    this.signIn();
    this.signUp();
    this.signOut();
    this.updateLogin();
    this.updatePassword();
    this.updateGroup();
  }

  // ! The update method is used to change user data that does not affect access control, such as avatar, name, and other data
  protected update(): void {
    const URL = `${this.basePath}/update`;

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
            if (userId !== ctx.request.body.id) {
              throw new Error("The model wasn't updated");
            }

            const response = await this.model.updateResponse(ctx.request.body, userId, wsid);

            if (response.result) {
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
  }

  // ! Returns the user object that was retrieved after authorization
  protected current(): void {
    const URL = `${this.basePath}/current`;

    this.router.get(URL, getAuthenticateMiddleware(), async (ctx: Koa.Context) => {
      const user = new this.Entity(ctx.request.user);

      if (user.isEntity()) {
        const response = new Response({
          result: user.getUnSecureData(),
          validates: new ValidateResult(),
        });

        ctx.status = 200;
        ctx.type = "application/json";
        ctx.body = JSON.stringify(response);
      } else {
        ctx.throw(`Current user is not available (${this.constructor.name})(${URL})`, 404);
      }
    });
  }

  protected signIn(): void {
    const URL = `${this.basePath}/signIn`;

    this.router.post(
      URL,
      async (ctx: Koa.Context): Promise<void> => {
        const token: string | null = await this.model.signIn(ctx.request.body);

        if (isString(token)) {
          setCookieForAuthenticate(ctx, token);

          ctx.status = 200;
          ctx.type = "application/json";
          ctx.body = new Response({
            result: {},
            validates: new ValidateResult(),
          });
        } else {
          const message = `SingIn (${this.constructor.name})(${URL}) has been failed`;

          ctx.throw(message, 404);
        }
      },
    );
  }

  protected signUp(): void {
    const URL = `${this.basePath}/signUp`;

    this.router.post(URL, async (ctx: Koa.Context) => {
      const token: string | Response | null = await this.model.signUp(ctx.request.body);

      if (isString(token)) {
        setCookieForAuthenticate(ctx, token);

        ctx.status = 200;
        ctx.type = "application/json";
        ctx.body = new Response({
          result: {},
          validates: new ValidateResult(),
        });
      } else {
        const message = `SingUp (${this.constructor.name})(${URL}) has been failed`;

        ctx.throw(message, 404);
      }
    });
  }

  // ! Этот метод необходим для системного администратора, которому нужно мочь создавать пользователй.
  protected create(): void {
    const URL = `${this.basePath}/create`;

    this.router.put(URL, getAuthenticateMiddleware(), async (ctx: Koa.Context) => {
      await this.executor(ctx, URL, this.ACL.create, this.switchers.create, async () => {
        const response: string | Response | null = await this.model.signUp(ctx.request.body, true);

        if (response instanceof Response && response.result) {
          ctx.status = 200;
          ctx.type = "application/json";
          ctx.body = JSON.stringify(response);
        } else {
          const message = `Create (${this.constructor.name})(${URL}) has been failed`;

          ctx.throw(message, 404);
        }
      });
    });
  }

  protected signOut(): void {
    const URL = `${this.basePath}/signOut`;

    this.router.post(URL, getAuthenticateMiddleware(), async (ctx: Koa.Context) => {
      await this.executor(ctx, URL, this.ACL.signOut, this.switchers.signOut, async () => {
        unsetCookieForAuthenticate(ctx);

        ctx.status = 200;
        ctx.type = "application/json";
        ctx.body = new Response({
          result: {},
          validates: new ValidateResult(),
        });
      });
    });
  }

  protected updateLogin(): void {
    const URL = `${this.basePath}/updateLogin`;

    this.router.post(URL, getAuthenticateMiddleware(), async (ctx: Koa.Context) => {
      await this.executor(
        ctx,
        URL,
        this.ACL.updateLogin,
        this.switchers.updateLogin,
        async (userId: string, wsid: string) => {
          const response: Response = await this.model.updateLoginResponse(
            ctx.request.body,
            userId,
            wsid,
          );

          if (response.result) {
            ctx.status = 200;
            ctx.type = "application/json";
            ctx.body = JSON.stringify(response);
          } else {
            const message = `UpdateLogin (${this.constructor.name})(${URL}) has been failed`;

            ctx.throw(message, 404);
          }
        },
      );
    });
  }

  protected updatePassword(): void {
    const URL = `${this.basePath}/updatePassword`;

    this.router.post(URL, getAuthenticateMiddleware(), async (ctx: Koa.Context) => {
      await this.executor(
        ctx,
        URL,
        this.ACL.updatePassword,
        this.switchers.updatePassword,
        async (userId: string, wsid: string) => {
          const response: Response = await this.model.updatePasswordResponse(
            ctx.request.body,
            userId,
            wsid,
          );

          if (response.result) {
            ctx.status = 200;
            ctx.type = "application/json";
            ctx.body = JSON.stringify(response);
          } else {
            const message = `UpdatePassword (${this.constructor.name})(${URL}) has been failed`;

            ctx.throw(message, 404);
          }
        },
      );
    });
  }

  protected updateGroup(): void {
    const URL = `${this.basePath}/updateGroup`;

    this.router.post(URL, getAuthenticateMiddleware(), async (ctx: Koa.Context) => {
      await this.executor(
        ctx,
        URL,
        this.ACL.updateGroup,
        this.switchers.updateGroup,
        async (userId: string, wsid: string): Promise<void> => {
          const { ids, group } = ctx.request.body;

          const listResponse = await this.model.updateGroupResponse(ids, group, userId, wsid);

          if (listResponse.results.length === 0) {
            const message = `UpdateGroup (${this.constructor.name})(${URL}) has been failed`;

            ctx.throw(message, 404);
          }

          ctx.status = 200;
          ctx.type = "application/json";
          ctx.body = JSON.stringify(listResponse);
        },
      );
    });
  }
}

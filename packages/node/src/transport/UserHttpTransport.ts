/* eslint-disable no-unused-vars */
import { Response, User, userGroupEnum, ValidationResult } from "@rtcts/isomorphic";
import { isString } from "@rtcts/utils";
import Koa from "koa";
import {
  getAuthenticateMiddleware,
  setCookieForAuthenticate,
  unsetCookieForAuthenticate,
} from "../app/auth";
import { Config } from "../app/Config";
import { getRequestBodyJson } from "../app/getRequestBodyJson";
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
  MODEL extends UserModel<ENTITY, CONFIG>,
  ENTITY extends User,
  CONFIG extends Config = Config,
  CHANNELS extends Channels = Channels
> extends HttpTransport<MODEL, ENTITY, ENTITY, CHANNELS> {
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

    this.ACL = ACL;
    this.switchers = switchers;

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
      getRequestBodyJson(),
      async (ctx: Koa.Context): Promise<void> => {
        await this.executor(
          ctx,
          URL,
          this.ACL.update,
          this.switchers.update,
          async (userId: string, wsid: string) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            if (userId !== ctx?.request?.body?.id) {
              throw new Error("The model wasn't updated");
            }

            const response: Response = await this.model.updateResponse(
              ctx.request.body,
              userId,
              wsid,
            );
            const hasNotPayload = this.send(ctx, response);

            if (hasNotPayload) {
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

    this.router.get(URL, getAuthenticateMiddleware(), (ctx: Koa.Context) => {
      const user = new this.Entity(ctx.request.user);

      if (user.isEntity()) {
        const response = new Response({
          payload: user.getUnSecureData(),
          validationResult: new ValidationResult([]),
        });

        ctx.status = 200;
        ctx.type = "application/json";
        ctx.body = JSON.stringify(response);
      } else {
        ctx.throw(404, `Current user is not available (${this.constructor.name})(${URL})`);
      }
    });
  }

  protected signIn(): void {
    const URL = `${this.basePath}/signIn`;

    this.router.post(
      URL,
      getRequestBodyJson(),
      async (ctx: Koa.Context): Promise<void> => {
        const result: string | Response | null = await this.model.signIn(ctx.request.body);
        const errorMessage = `SingIn (${this.constructor.name})(${URL}) has been failed`;

        if (isString(result)) {
          setCookieForAuthenticate(ctx, result);

          ctx.status = 200;
          ctx.type = "application/json";
          ctx.body = new Response({
            payload: null,
            validationResult: new ValidationResult([]),
          });
        }

        if (result instanceof Response) {
          const hasNotPayload = this.send(ctx, result);

          if (hasNotPayload) {
            ctx.throw(404, errorMessage);
          }
        }

        if (result === null) {
          ctx.throw(404, errorMessage);
        }
      },
    );
  }

  protected signUp(): void {
    const URL = `${this.basePath}/signUp`;

    this.router.post(URL, getRequestBodyJson(), async (ctx: Koa.Context) => {
      const result: string | Response | null = await this.model.signUp(ctx.request.body);
      const errorMessage = `SingUp (${this.constructor.name})(${URL}) has been failed`;

      if (isString(result)) {
        setCookieForAuthenticate(ctx, result);

        ctx.status = 200;
        ctx.type = "application/json";
        ctx.body = new Response({
          payload: null,
          validationResult: new ValidationResult([]),
        });
      }

      if (result instanceof Response) {
        const hasNotPayload = this.send(ctx, result);

        if (hasNotPayload) {
          ctx.throw(404, errorMessage);
        }
      }

      if (result === null) {
        ctx.throw(404, errorMessage);
      }
    });
  }

  // ! Этот метод необходим для системного администратора, которому нужно мочь создавать пользователй.
  protected create(): void {
    const URL = `${this.basePath}/create`;

    this.router.put(
      URL,
      getAuthenticateMiddleware(),
      getRequestBodyJson(),
      async (ctx: Koa.Context) => {
        await this.executor(ctx, URL, this.ACL.create, this.switchers.create, async () => {
          const result: string | Response | null = await this.model.signUp(ctx.request.body, true);
          const errorMessage = `Create (${this.constructor.name})(${URL}) has been failed`;

          if (isString(result)) {
            ctx.status = 200;
            ctx.type = "application/json";
            ctx.body = new Response({
              payload: null,
              validationResult: new ValidationResult([]),
            });
          }

          if (result instanceof Response) {
            const hasNotPayload = this.send(ctx, result);

            if (hasNotPayload) {
              ctx.throw(404, errorMessage);
            }
          }

          if (result === null) {
            ctx.throw(404, errorMessage);
          }
        });
      },
    );
  }

  protected signOut(): void {
    const URL = `${this.basePath}/signOut`;

    this.router.post(URL, getAuthenticateMiddleware(), async (ctx: Koa.Context) => {
      await this.executor(ctx, URL, this.ACL.signOut, this.switchers.signOut, (): void => {
        unsetCookieForAuthenticate(ctx);

        ctx.status = 200;
        ctx.type = "application/json";
        ctx.body = new Response({
          payload: null,
          validationResult: new ValidationResult([]),
        });
      });
    });
  }

  protected updateLogin(): void {
    const URL = `${this.basePath}/updateLogin`;

    this.router.post(
      URL,
      getAuthenticateMiddleware(),
      getRequestBodyJson(),
      async (ctx: Koa.Context) => {
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
            const hasNotPayload = this.send(ctx, response);

            if (hasNotPayload) {
              const message = `UpdateLogin (${this.constructor.name})(${URL}) has been failed`;

              ctx.throw(404, message);
            }
          },
        );
      },
    );
  }

  protected updatePassword(): void {
    const URL = `${this.basePath}/updatePassword`;

    this.router.post(
      URL,
      getAuthenticateMiddleware(),
      getRequestBodyJson(),
      async (ctx: Koa.Context) => {
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
            const hasNotPayload = this.send(ctx, response);

            if (hasNotPayload) {
              const message = `UpdatePassword (${this.constructor.name})(${URL}) has been failed`;

              ctx.throw(404, message);
            }
          },
        );
      },
    );
  }

  protected updateGroup(): void {
    const URL = `${this.basePath}/updateGroup`;

    this.router.post(
      URL,
      getAuthenticateMiddleware(),
      getRequestBodyJson(),
      async (ctx: Koa.Context) => {
        await this.executor(
          ctx,
          URL,
          this.ACL.updateGroup,
          this.switchers.updateGroup,
          async (userId: string, wsid: string): Promise<void> => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const { ids, group } = ctx.request.body;
            const listResponse = await this.model.updateGroupResponse(ids, group, userId, wsid);

            ctx.status = 200;
            ctx.type = "application/json";
            ctx.body = JSON.stringify(listResponse);
          },
        );
      },
    );
  }
}

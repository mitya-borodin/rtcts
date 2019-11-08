import { IEntity, IUser, userGroupEnum } from "@borodindmitriy/interfaces";
import { User } from "@borodindmitriy/isomorphic";
import { getErrorMessage } from "@borodindmitriy/utils";
import * as express from "express";
import passport from "passport";
import { IChannels } from "./interfaces/IChannels";
import { IUserModel } from "./interfaces/IUserModel";
import { Service } from "./Service";

export class UserService<
  P extends IUser & IEntity = IUser & IEntity,
  I extends IUser = IUser,
  C extends IChannels = IChannels,
  M extends IUserModel<P> = IUserModel<P>
> extends Service<M, P, I, C> {
  protected model: M;
  protected readonly ACL: {
    readonly collection: string[];
    readonly read: string[];
    readonly channel: string[];
    readonly create: string[];
    readonly remove: string[];
    readonly update: string[];
    readonly updateLogin: string[];
    readonly updatePassword: string[];
    readonly updateGroup: string[];
    readonly signUp: string[];
  };

  constructor(
    name: string,
    router: express.Router,
    Persist: new (data: any) => P,
    Insert: new (data: any) => I,
    model: M,
    channels: C,
    ACL: {
      collection: string[];
      read: string[];
      channel: string[];
      create: string[];
      remove: string[];
      update: string[];
      updateLogin: string[];
      updatePassword: string[];
      updateGroup: string[];
      signUp: string[];
    },
  ) {
    super(name, router, Persist, Insert, model, channels, ACL);

    this.model = model;
    this.ACL = ACL;

    this.current();
    this.signIn();
    this.signUp();
    this.updateLogin();
    this.updatePassword();
    this.updateGroup();
  }

  protected collection(): void {
    const URL = `/${this.name}/collection`;

    this.router.get(
      URL,
      passport.authenticate("jwt", { session: false }),
      async (req: express.Request, res: express.Response) => {
        try {
          const user = req.user;

          if (
            user instanceof User &&
            (this.ACL.update.length === 0 || this.ACL.update.includes(user.group))
          ) {
            let collection: P[] = [];

            if (user.group === userGroupEnum.admin) {
              collection = await this.model.readAll();
            } else {
              collection = await this.model.read(
                {},
                { projection: { login: 1, group: 1 } },
                user.id,
              );
            }

            res.status(200).json(collection.map((item) => item.toJSSecure()));
          } else {
            res.status(403).send(`[ ${this.constructor.name} ][ URL: ${URL} ][ ACCESS_DENIED ]`);
          }
        } catch (error) {
          res
            .status(500)
            .send(
              `[ ${this.constructor.name} ][ URL: ${URL} ][ ERROR_MESSAGE: ${getErrorMessage(
                error,
              )} ]`,
            );
        }
      },
    );
  }

  protected update(): void {
    const URL = `/${this.name}/update`;

    this.router.post(
      URL,
      passport.authenticate("jwt", { session: false }),
      async (req: express.Request, res: express.Response) => {
        try {
          const { wsid, ...data } = req.body;
          const persist = new this.Persist(data);

          const user = req.user;

          if (
            user instanceof User &&
            (persist.id === user.id ||
              this.ACL.update.length === 0 ||
              this.ACL.update.includes(user.group))
          ) {
            const result: P | null = await this.model.update(persist.toJSSecure(), user.id, wsid);

            if (result) {
              res.status(200).json(result.toJS());
            } else {
              res
                .status(404)
                .send(
                  `[ ${this.constructor.name} ][ URL: ${URL} ][ USERS_NOT_FOUND_BY_ID: ${
                    req.body.id
                  } ]`,
                );
            }
          } else {
            res.status(403).send(`[ ${this.constructor.name} ][ URL: ${URL} ][ ACCESS_DENIED ]`);
          }
        } catch (error) {
          res
            .status(500)
            .send(
              `[ ${this.constructor.name} ][ URL: ${URL} ][ ERROR_MESSAGE: ${getErrorMessage(
                error,
              )} ]`,
            );
        }
      },
    );
  }

  protected current(): void {
    const URL = `/${this.name}/current`;

    this.router.get(
      URL,
      passport.authenticate("jwt", { session: false }),
      async (req: express.Request, res: express.Response) => {
        try {
          res.status(200).json(new this.Persist(req.user).toJSSecure());
        } catch (error) {
          res
            .status(500)
            .send(
              `[ ${this.constructor.name} ][ URL: ${URL} ][ ERROR_MESSAGE: ${getErrorMessage(
                error,
              )} ]`,
            );
        }
      },
    );
  }

  protected signUp(): void {
    const URL = `/${this.name}/signUp`;

    this.router.post(
      URL,
      passport.authenticate("jwt", { session: false }),
      async (req: express.Request, res: express.Response) => {
        try {
          const user = req.user;

          if (
            user instanceof User &&
            (this.ACL.update.length === 0 || this.ACL.update.includes(user.group))
          ) {
            const result: { token: string; user: object } = await this.model.signUp(req.body);

            res.status(200).json(result);
          } else {
            res.status(403).send(`[ ${this.constructor.name} ][ URL: ${URL} ][ ACCESS_DENIED ]`);
          }
        } catch (error) {
          res
            .status(500)
            .send(
              `[ ${this.constructor.name} ][ URL: ${URL} ][ ERROR_MESSAGE: ${getErrorMessage(
                error,
              )} ]`,
            );
        }
      },
    );
  }

  protected signIn(): void {
    const URL = `/${this.name}/signIn`;

    this.router.post(URL, async (req: express.Request, res: express.Response) => {
      try {
        const result: string | null = await this.model.signIn(req.body);

        if (result) {
          res.status(200).json(result);
        } else {
          res
            .status(404)
            .send(
              `[ ${
                this.constructor.name
              } ][ URL: ${URL} ][ USERS_NOT_FOUND_BY_LOGIN_AND_PASSWORD: { login: ${
                req.body.login
              }, password: ${req.body.password} } ]`,
            );
        }
      } catch (error) {
        res
          .status(500)
          .send(
            `[ ${this.constructor.name} ][ URL: ${URL} ][ ERROR_MESSAGE: ${getErrorMessage(
              error,
            )} ]`,
          );
      }
    });
  }

  protected updateLogin(): void {
    const URL = `/${this.name}/updateLogin`;

    this.router.post(
      URL,
      passport.authenticate("jwt", { session: false }),
      async (req: express.Request, res: express.Response) => {
        try {
          const user = req.user;

          if (
            user instanceof User &&
            (this.ACL.update.length === 0 || this.ACL.update.includes(user.group))
          ) {
            const { wsid, ...data } = req.body;
            const result: P | null = await this.model.updateLogin(data, user.id, wsid);

            if (result) {
              res.status(200).json(result.toJSSecure());
            } else {
              res
                .status(404)
                .send(
                  `[ ${this.constructor.name} ][ URL: ${URL} ][ USERS_NOT_FOUND_BY_LOGIN: ${
                    data.login
                  } ]`,
                );
            }
          } else {
            res.status(403).send(`[ ${this.constructor.name} ][ URL: ${URL} ][ ACCESS_DENIED ]`);
          }
        } catch (error) {
          res
            .status(500)
            .send(
              `[ ${this.constructor.name} ][ URL: ${URL} ][ ERROR_MESSAGE: ${getErrorMessage(
                error,
              )} ]`,
            );
        }
      },
    );
  }

  protected updatePassword(): void {
    const URL = `/${this.name}/updatePassword`;

    this.router.post(
      URL,
      passport.authenticate("jwt", { session: false }),
      async (req: express.Request, res: express.Response) => {
        try {
          const user = req.user;

          if (user instanceof User) {
            const { wsid, ...data } = req.body;
            const himSelfUpdate = data.id === user.id;

            if (
              himSelfUpdate ||
              this.ACL.updatePassword.length === 0 ||
              this.ACL.updatePassword.includes(user.group)
            ) {
              const result: P | null = await this.model.updatePassword(data, user.id, wsid);

              if (result) {
                res.status(200).json(result.toJSSecure());
              } else {
                res
                  .status(404)
                  .send(
                    `[ ${this.constructor.name} ][ URL: ${URL} ][ USERS_NOT_FOUND_BY_ID: ${
                      data.id
                    } ]`,
                  );
              }
            } else {
              res.status(403).send(`[ ${this.constructor.name} ][ URL: ${URL} ][ ACCESS_DENIED ]`);
            }
          }
        } catch (error) {
          res
            .status(500)
            .send(
              `[ ${this.constructor.name} ][ URL: ${URL} ][ ERROR_MESSAGE: ${getErrorMessage(
                error,
              )} ]`,
            );
        }
      },
    );
  }

  protected updateGroup(): void {
    const URL = `/${this.name}/updateGroup`;

    this.router.post(
      URL,
      passport.authenticate("jwt", { session: false }),
      async (req: express.Request, res: express.Response) => {
        try {
          const user = req.user;

          if (user instanceof User) {
            const { ids, group, wsid } = req.body;
            const himSelfUpdate = ids.length === 1 && ids[0] === user.id;

            if (req.user) {
              if (
                this.ACL.updateGroup.length === 0 ||
                himSelfUpdate ||
                this.ACL.updateGroup.includes(user.group)
              ) {
                const result: P[] = await this.model.updateGroup(ids, group, user.id, wsid);

                if (result) {
                  res.status(200).json(result.map((r) => r.toJSSecure()));
                } else {
                  res
                    .status(404)
                    .send(
                      `[ ${
                        this.constructor.name
                      } ][ URL: ${URL} ][ USERS_NOT_FOUND_BY_IDs: ${ids} ]`,
                    );
                }
              } else {
                res
                  .status(403)
                  .send(`[ ${this.constructor.name} ][ URL: ${URL} ][ ACCESS_DENIED ]`);
              }
            }
          }
        } catch (error) {
          res
            .status(500)
            .send(
              `[ ${this.constructor.name} ][ URL: ${URL} ][ ERROR_MESSAGE: ${getErrorMessage(
                error,
              )} ]`,
            );
        }
      },
    );
  }
}

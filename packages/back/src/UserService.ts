import { IPersist, IUser, userGroupEnum } from "@borodindmitriy/interfaces";
import { getErrorMessage } from "@borodindmitriy/utils";
import * as express from "express";
import * as passport from "passport";
import { IChannels } from "./interfaces/IChannels";
import { IUserModel } from "./interfaces/IUserModel";
import { Service } from "./Service";

export class UserService<
  P extends IUser & IPersist = IUser & IPersist,
  I extends IUser = IUser,
  C extends IChannels = IChannels,
  M extends IUserModel<P> = IUserModel<P>
> extends Service<M, P, I, C> {
  protected model: M;
  protected readonly ACL: {
    readonly collection: string[];
    readonly model: string[];
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
      model: string[];
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
          if (this.ACL.collection.length === 0 || (req.user && this.ACL.collection.includes(req.user.group))) {
            let collection: P[] = [];

            if (req.user.group === userGroupEnum.admin) {
              collection = await this.model.readAll();
            } else {
              collection = await this.model.read({}, { projection: { login: 1, group: 1 } }, req.user.id);
            }

            res.status(200).json(collection.map((item) => item.toJSSecure()));
          } else {
            res.status(403).send(`[ ${this.constructor.name} ][ URL: ${URL} ][ ACCESS_DENIED ]`);
          }
        } catch (error) {
          res
            .status(500)
            .send(`[ ${this.constructor.name} ][ URL: ${URL} ][ ERROR_MESSAGE: ${getErrorMessage(error)} ]`);
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

          if (
            this.ACL.update.length === 0 ||
            persist.id === req.user.id ||
            (req.user && this.ACL.update.includes(req.user.group))
          ) {
            const result: P | null = await this.model.update(persist.toJSSecure(), req.user.id, wsid);

            if (result) {
              res.status(200).json(result.toJS());
            } else {
              res
                .status(404)
                .send(`[ ${this.constructor.name} ][ URL: ${URL} ][ USERS_NOT_FOUND_BY_ID: ${req.body.id} ]`);
            }
          } else {
            res.status(403).send(`[ ${this.constructor.name} ][ URL: ${URL} ][ ACCESS_DENIED ]`);
          }
        } catch (error) {
          res
            .status(500)
            .send(`[ ${this.constructor.name} ][ URL: ${URL} ][ ERROR_MESSAGE: ${getErrorMessage(error)} ]`);
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
            .send(`[ ${this.constructor.name} ][ URL: ${URL} ][ ERROR_MESSAGE: ${getErrorMessage(error)} ]`);
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
          if (this.ACL.signUp.length === 0 || (req.user && this.ACL.signUp.includes(req.user.group))) {
            const result: { token: string; user: object } = await this.model.signUp(req.body);

            res.status(200).json(result);
          } else {
            res.status(403).send(`[ ${this.constructor.name} ][ URL: ${URL} ][ ACCESS_DENIED ]`);
          }
        } catch (error) {
          res
            .status(500)
            .send(`[ ${this.constructor.name} ][ URL: ${URL} ][ ERROR_MESSAGE: ${getErrorMessage(error)} ]`);
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
              `[ ${this.constructor.name} ][ URL: ${URL} ][ USERS_NOT_FOUND_BY_LOGIN_AND_PASSWORD: { login: ${
                req.body.login
              }, password: ${req.body.password} } ]`,
            );
        }
      } catch (error) {
        res.status(500).send(`[ ${this.constructor.name} ][ URL: ${URL} ][ ERROR_MESSAGE: ${getErrorMessage(error)} ]`);
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
          if (this.ACL.updateLogin.length === 0 || (req.user && this.ACL.updateLogin.includes(req.user.group))) {
            const { wsid, ...data } = req.body;
            const result: P | null = await this.model.updateLogin(data, req.user.id, wsid);

            if (result) {
              res.status(200).json(result.toJSSecure());
            } else {
              res
                .status(404)
                .send(`[ ${this.constructor.name} ][ URL: ${URL} ][ USERS_NOT_FOUND_BY_LOGIN: ${data.login} ]`);
            }
          } else {
            res.status(403).send(`[ ${this.constructor.name} ][ URL: ${URL} ][ ACCESS_DENIED ]`);
          }
        } catch (error) {
          res
            .status(500)
            .send(`[ ${this.constructor.name} ][ URL: ${URL} ][ ERROR_MESSAGE: ${getErrorMessage(error)} ]`);
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
          const { wsid, ...data } = req.body;
          const himSelfUpdate = data.id === req.user.id;

          if (
            himSelfUpdate ||
            this.ACL.updatePassword.length === 0 ||
            (req.user && this.ACL.updatePassword.includes(req.user.group))
          ) {
            const result: P | null = await this.model.updatePassword(data, req.user.id, wsid);

            if (result) {
              res.status(200).json(result.toJSSecure());
            } else {
              res.status(404).send(`[ ${this.constructor.name} ][ URL: ${URL} ][ USERS_NOT_FOUND_BY_ID: ${data.id} ]`);
            }
          } else {
            res.status(403).send(`[ ${this.constructor.name} ][ URL: ${URL} ][ ACCESS_DENIED ]`);
          }
        } catch (error) {
          res
            .status(500)
            .send(`[ ${this.constructor.name} ][ URL: ${URL} ][ ERROR_MESSAGE: ${getErrorMessage(error)} ]`);
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
          const { ids, group, wsid } = req.body;
          const himSelfUpdate = ids.length === 1 && ids[0] === req.user.id;

          if (req.user) {
            if (this.ACL.updateGroup.length === 0 || himSelfUpdate || this.ACL.updateGroup.includes(req.user.group)) {
              const result: P[] = await this.model.updateGroup(ids, group, req.user.id, wsid);

              if (result) {
                res.status(200).json(result.map((r) => r.toJSSecure()));
              } else {
                res.status(404).send(`[ ${this.constructor.name} ][ URL: ${URL} ][ USERS_NOT_FOUND_BY_IDs: ${ids} ]`);
              }
            } else {
              res.status(403).send(`[ ${this.constructor.name} ][ URL: ${URL} ][ ACCESS_DENIED ]`);
            }
          }
        } catch (error) {
          res
            .status(500)
            .send(`[ ${this.constructor.name} ][ URL: ${URL} ][ ERROR_MESSAGE: ${getErrorMessage(error)} ]`);
        }
      },
    );
  }
}

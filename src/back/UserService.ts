import * as express from "express";
import * as passport from "passport";
import { userGroupEnum } from "../enums/userGroupEnum";
import { IPersist } from "../interfaces/IPersist";
import { IUser } from "../interfaces/IUser";
import { IChannels } from "./interfaces/IChannels";
import { IUserModel } from "./interfaces/IUserModel";
import { Service } from "./Service";

export class UserService<M extends IUserModel<U & IPersist, U>, U extends IUser> extends Service<
  M,
  U & IPersist,
  U,
  IChannels,
  U & IPersist
> {
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
    Persist: { new (data: any): U & IPersist },
    Insert: { new (data: any): U },
    model: M,
    channels: IChannels,
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

    this.router.get(
      `/${name}/current`,
      passport.authenticate("jwt", { session: false }),
      async (req: express.Request, res: express.Response) => {
        try {
          try {
            res.status(200).json(this.current(req.user));
          } catch (error) {
            res.status(500).send(error.message);
          }
        } catch (error) {
          res.status(500).send(error.message);
        }
      },
    );

    this.router.post(
      `/${name}/signUp`,
      passport.authenticate("jwt", { session: false }),
      async (req: express.Request, res: express.Response) => {
        if (req.user && this.ACL.updateLogin.includes(req.user.group)) {
          try {
            const result: { token: string; user: object } = await this.model.signUp(req.body);

            res.status(200).json(result);
          } catch (error) {
            res.status(500).send(error.message);
          }
        } else {
          res.status(403).send();
        }
      },
    );

    this.router.post(`/${name}/signIn`, async (req: express.Request, res: express.Response) => {
      try {
        const result: string | null = await this.model.signIn(req.body);

        if (result) {
          res.status(200).json(result);
        } else {
          res
            .status(404)
            .send(
              `User by login: ${req.body.login}, password: ${
                req.body.password
              }. Not found, or pair login-password incorrect;`,
            );
        }
      } catch (error) {
        res.status(500).send(error.message);
      }
    });

    this.router.post(
      `/${name}/updateLogin`,
      passport.authenticate("jwt", { session: false }),
      async (req: express.Request, res: express.Response) => {
        if (req.user && this.ACL.updateLogin.includes(req.user.group)) {
          try {
            const { wsid, ...data } = req.body;
            const result: U & IPersist | null = await this.model.updateLogin(data, req.user.id, wsid);

            if (result) {
              res.status(200).json(result.toJS());
            } else {
              res.status(404).send(`User with login: ${data.login}, not found.`);
            }
          } catch (error) {
            res.status(500).send(error.message);
          }
        } else {
          res.status(403).send();
        }
      },
    );

    this.router.post(
      `/${name}/updatePassword`,
      passport.authenticate("jwt", { session: false }),
      async (req: express.Request, res: express.Response) => {
        if (req.user && this.ACL.updatePassword.includes(req.user.group)) {
          try {
            const { wsid, ...data } = req.body;
            const result: U & IPersist | null = await this.model.updatePassword(data, req.user.id, wsid);

            if (result) {
              res.status(200).json(result.toJS());
            } else {
              res.status(404).send(`User not found.`);
            }
          } catch (error) {
            res.status(500).send(error.message);
          }
        } else {
          res.status(403).send();
        }
      },
    );

    this.router.post(
      `/${name}/updateGroup`,
      passport.authenticate("jwt", { session: false }),
      async (req: express.Request, res: express.Response) => {
        if (req.user && this.ACL.updateGroup.includes(req.user.group)) {
          try {
            const { ids, group, wsid } = req.body;
            const result: Array<U & IPersist> = await this.model.updateGroup(ids, group, req.user.id, wsid);

            if (result) {
              res.status(200).json(result.map((r) => r.toJS()));
            } else {
              res.status(404).send(`Users not found.`);
            }
          } catch (error) {
            res.status(500).send(error.message);
          }
        } else {
          res.status(403).send();
        }
      },
    );
  }

  protected async collection(req: express.Request, user: U & IPersist): Promise<Array<U & IPersist>> {
    if (user.group === userGroupEnum.admin) {
      return await this.model.readAll();
    }

    return await this.model.read({}, { projection: { login: 1, group: 1 } }, user.id);
  }

  protected current(user: U & IPersist): object {
    const persistUser = new this.Persist(user);

    return persistUser.toJSSecure();
  }
}

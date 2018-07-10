import * as express from "express";
import * as passport from "passport";
import { IPersist } from "../interfaces/IPersist";
import { IUser } from "../interfaces/IUser";
import { IUserGroup } from "../interfaces/IUserGroup";
import { IChannels } from "./interfaces/IChannels";
import { IUserModel } from "./interfaces/IUserModel";
import { Service } from "./Service";

export class UserService<
  M extends IUserModel<U & IPersist, U, G>,
  U extends IUser<G>,
  G extends IUserGroup
> extends Service<U & IPersist, U, IChannels, G> {
  protected model: M;
  protected readonly ACL: {
    readonly collection: G[];
    readonly model: G[];
    readonly channel: G[];
    readonly create: G[];
    readonly remove: G[];
    readonly update: G[];
    readonly updateLogin: G[];
    readonly updatePassword: G[];
    readonly updateGroup: G[];
    readonly signUp: G[];
  };

  constructor(
    name: string,
    router: express.Router,
    Persist: { new (data: any): U & IPersist },
    Insert: { new (data: any): U },
    model: M,
    channels: IChannels,
    ACL: {
      collection: G[];
      model: G[];
      channel: G[];
      create: G[];
      remove: G[];
      update: G[];
      updateLogin: G[];
      updatePassword: G[];
      updateGroup: G[];
      signUp: G[];
    },
  ) {
    super(name, router, Persist, Insert, model, channels, ACL);

    this.router.get(
      `/${name}/current`,
      passport.authenticate("jwt", { session: false }),
      async (req: express.Request, res: express.Response) => {
        try {
          const currentUser = req.user;

          if (currentUser) {
            res.status(200).json(currentUser);
          } else {
            res.status(404).send("Current user is not recognized;");
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
            const result: string = await this.model.signUp(req.body);

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
        const { login, password } = req.body;
        const result: string | null = await this.model.signIn(login, password);

        if (result) {
          res.status(200).json(result);
        } else {
          res
            .status(404)
            .send(`User by login: ${login}, password: ${password}. Not found, or pair login-password incorrect;`);
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
            const { id, login, wsid } = req.body;
            const result: U & IPersist | null = await this.model.updateLogin(id, login, req.user.id, wsid);

            if (result) {
              res.status(200).json(result.toJS());
            } else {
              res.status(404).send(`User with login: ${login}, not found.`);
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
            const { id, password, passwordConfirm, wsid } = req.body;
            const result: U & IPersist | null = await this.model.updatePassword(
              id,
              password,
              passwordConfirm,
              req.user.id,
              wsid,
            );

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
            const { ids, group } = req.body;
            const result: Array<U & IPersist> = await this.model.updateGroup(ids, group);

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
}

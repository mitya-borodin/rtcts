import * as express from "express";
import * as passport from "passport";
import { IInsert } from "../interfaces/IInsert";
import { IPersist } from "../interfaces/IPersist";
import { IUser } from "../interfaces/IUser";
import { IChannels } from "./interfaces/IChannels";
import { IModel } from "./interfaces/IModel";

export class Service<
  M extends IModel<P, I>,
  P extends IPersist,
  I extends IInsert,
  C extends IChannels,
  U extends IUser & IPersist
> {
  protected readonly name: string;
  protected readonly router: express.Router;
  protected readonly Insert: { new (data: any): I };
  protected readonly Persist: { new (data: any): P };
  protected readonly model: M;
  protected readonly channels: C;
  protected readonly ACL: {
    readonly collection: string[];
    readonly model: string[];
    readonly create: string[];
    readonly remove: string[];
    readonly update: string[];
    readonly channel: string[];
  };

  constructor(
    name: string,
    router: express.Router,
    Persist: { new (data: any): P },
    Insert: { new (data: any): I },
    model: M,
    channels: C,
    ACL: {
      collection: string[];
      create: string[];
      model: string[];
      remove: string[];
      update: string[];
      channel: string[];
    },
  ) {
    this.name = name;
    this.router = router;
    this.Insert = Insert;
    this.Persist = Persist;
    this.model = model;
    this.channels = channels;
    this.ACL = ACL;

    this.router.get(
      `/${name}/collection`,
      passport.authenticate("jwt", { session: false }),
      async (req: express.Request, res: express.Response) => {
        if (req.user && this.ACL.collection.includes(req.user.group)) {
          try {
            const collection = await this.collection(req, req.user as U);

            res.status(200).json(collection.map((item) => item.toJS()));
          } catch (error) {
            res.status(500).send(error.message);
          }
        } else {
          res.status(403).send();
        }
      },
    );
    this.router.get(
      `/${name}/model`,
      passport.authenticate("jwt", { session: false }),
      async (req: express.Request, res: express.Response) => {
        if (req.user && this.ACL.model.includes(req.user.group)) {
          try {
            const result: P | null = await this.singleModel(req, req.user as U);

            if (result) {
              res.status(200).json(result.toJS());
            } else {
              res.status(404).send(`Model not found by id: /${req.params.id}`);
            }
          } catch (error) {
            res.status(500).send(error.message);
          }
        } else {
          res.status(403).send();
        }
      },
    );
    this.router.put(
      `/${name}/create`,
      passport.authenticate("jwt", { session: false }),
      async (req: express.Request, res: express.Response) => {
        if (req.user && this.ACL.model.includes(req.user.group)) {
          try {
            const result: P | null = await this.create(req, req.user as U);

            if (result) {
              res.status(200).json(result.toJS());
            } else {
              throw new Error("Ошибка создания модели.");
            }
          } catch (error) {
            console.error(error);
            res.status(500).send(error.message);
          }
        } else {
          res.status(403).send();
        }
      },
    );
    this.router.post(
      `/${name}/update`,
      passport.authenticate("jwt", { session: false }),
      async (req: express.Request, res: express.Response) => {
        if (req.user && this.ACL.model.includes(req.user.group)) {
          try {
            const result: P | null = await this.update(req, req.user as U);

            if (result) {
              res.status(200).json(result.toJS());
            } else {
              res.status(404).send(`Model not found by id: /${req.body.id}`);
            }
          } catch (error) {
            console.error(error);
            res.status(500).send(error.message);
          }
        } else {
          res.status(403).send();
        }
      },
    );
    this.router.delete(
      `/${name}/remove`,
      passport.authenticate("jwt", { session: false }),
      async (req: express.Request, res: express.Response) => {
        if (req.user && this.ACL.model.includes(req.user.group)) {
          try {
            const result: P | null = await this.remove(req, req.user as U);

            if (result) {
              res.status(200).json(result.toJS());
            } else {
              res.status(404).send(`Model not found by id: ${req.body.id}`);
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
      `/${name}/channel`,
      passport.authenticate("jwt", { session: false }),
      async (req: express.Request, res: express.Response) => {
        if (req.user && this.ACL.channel.includes(req.user.group)) {
          try {
            const { action, channelName, wsid } = req.body;

            if (action === "on") {
              this.channels.on(channelName, req.user.id, wsid);

              res.status(200).json({});
            } else if (action === "off") {
              this.channels.off(channelName, req.user.id, wsid);

              res.status(200).json({});
            } else {
              res.status(404).send(`Channel action not found: /${action}`);
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

  protected async collection(req: express.Request, user: U): Promise<P[]> {
    return await this.model.read({});
  }

  protected async singleModel(req: express.Request, user: U): Promise<P | null> {
    return await this.model.readById(req.params.id);
  }

  protected async create(req: express.Request, user: U): Promise<P | null> {
    const { wsid, ...data } = req.body;
    const insert = new this.Insert(data);

    return await this.model.create(insert.toJS(), user.id, wsid);
  }

  protected async update(req: express.Request, user: U): Promise<P | null> {
    const { wsid, ...data } = req.body;
    const persist = new this.Persist(data);

    return await this.model.update(persist.toJS(), user.id, wsid);
  }

  protected async remove(req: express.Request, user: U): Promise<P | null> {
    const { wsid, id } = req.body;

    return await this.model.remove(id, user.id, wsid);
  }
}

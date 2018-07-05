import * as express from "express";
import { IPersist } from "interfaces/IPersist";
import { IUserGroup } from "interfaces/IUserGroup";
import * as passport from "passport";
import { IInsert } from "../interfaces/IInsert";
import { IChannels } from "./interfaces/IChannels";
import { IModel } from "./interfaces/IModel";

export class Service<P extends IPersist, I extends IInsert, C extends IChannels, G extends IUserGroup> {
  protected readonly name: string;
  protected readonly router: express.Router;
  protected readonly Insert: { new (data: any): I };
  protected readonly Persist: { new (data: any): P };
  protected readonly model: IModel<P, I>;
  protected readonly channels: C;
  protected readonly ACL: {
    readonly collection: G[];
    readonly model: G[];
    readonly create: G[];
    readonly remove: G[];
    readonly update: G[];
    readonly channel: G[];
  };

  constructor(
    name: string,
    router: express.Router,
    Persist: { new (data: any): P },
    Insert: { new (data: any): I },
    model: IModel<P, I>,
    channels: C,
    ACL: {
      collection: G[];
      create: G[];
      model: G[];
      remove: G[];
      update: G[];
      channel: G[];
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
            const collection = await this.model.read();

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
            const result: P | null = await this.model.readById(req.params.id);

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
            const { wsid, ...data } = req.body;
            const insert = new this.Insert(data);
            const result: P | null = await this.model.create(insert.toJS(), req.user.id, wsid);

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
            const { wsid, ...data } = req.body;
            const persist = new this.Persist(data);
            const result: P | null = await this.model.update(persist.toJS(), req.user.id, wsid);

            if (result) {
              res.status(200).json(result.toJS());
            } else {
              res.status(404).send(`Model not found by id: /${data.id}`);
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
            const { wsid, id } = req.body;
            const result: P | null = await this.model.remove(id, req.user.id, wsid);

            if (result) {
              res.status(200).json(result.toJS());
            } else {
              res.status(404).send(`Model not found by id: ${id}`);
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
}

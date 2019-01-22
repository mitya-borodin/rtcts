import { IInsert, IPersist } from "@borodindmitriy/interfaces";
import { getErrorMessage } from "@borodindmitriy/utils";
import * as express from "express";
import * as passport from "passport";
import { IChannels } from "./interfaces/IChannels";
import { ICommonModel } from "./interfaces/ICommonModel";
import { IModel } from "./interfaces/IModel";

export class CommonService<
  M extends ICommonModel<P>,
  P extends IPersist,
  I extends IInsert,
  C extends IChannels,
  Router extends express.Router = express.Router
> {
  protected readonly name: string;
  protected readonly router: Router;
  protected readonly Insert: { new (data: any): I };
  protected readonly Persist: { new (data: any): P };
  protected readonly model: M;
  protected readonly channels: C;
  protected readonly ACL: {
    readonly model: string[];
    readonly create: string[];
    readonly update: string[];
    readonly channel: string[];
  };

  constructor(
    name: string,
    router: Router,
    Persist: new (data: any) => P,
    Insert: new (data: any) => I,
    model: M,
    channels: C,
    ACL: {
      model: string[];
      create: string[];
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

    this.read();
    this.create();
    this.update();
    this.channel();
  }

  protected read(): void {
    const URL = `/${this.name}/model`;

    this.router.get(
      URL,
      passport.authenticate("jwt", { session: false }),
      async (req: express.Request, res: express.Response) => {
        try {
          if (this.ACL.model.length === 0 || (req.user && this.ACL.model.includes(req.user.group))) {
            const result: P | null = await this.model.read();

            if (result) {
              res.status(200).json(result.toJS());
            } else {
              res
                .status(404)
                .send(`[ ${this.constructor.name} ][ URL: ${URL} ][ MODEL_NOT_FOUND_BY_ID: ${req.query.id} ]`);
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

  protected create(): void {
    const URL = `/${this.name}/create`;

    this.router.put(
      URL,
      passport.authenticate("jwt", { session: false }),
      async (req: express.Request, res: express.Response) => {
        try {
          if (this.ACL.create.length === 0 || (req.user && this.ACL.create.includes(req.user.group))) {
            const { wsid, ...data } = req.body;
            const insert = new this.Insert(data);
            const result = await this.model.create(insert.toJS(), req.user.id, wsid);

            if (result) {
              res.status(200).json(result.toJS());
            } else {
              throw new Error("MODEL_DOES_NOT_CREATED");
            }
          } else {
            res.status(403).send(`[ ${this.constructor.name} ][ URL: ${URL} ][ ACCESS_DENIED ]`);
          }
        } catch (error) {
          console.error(error);
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
          if (this.ACL.update.length === 0 || (req.user && this.ACL.update.includes(req.user.group))) {
            const { wsid, ...data } = req.body;
            const persist = new this.Persist(data);
            const result: P | null = await this.model.update(persist.toJS(), req.user.id, wsid);

            if (result) {
              res.status(200).json(result.toJS());
            } else {
              res
                .status(404)
                .send(`[ ${this.constructor.name} ][ URL: ${URL} ][ MODEL_NOT_FOUND_BY_ID: ${req.body.id} ]`);
            }
          } else {
            res.status(403).send(`[ ${this.constructor.name} ][ URL: ${URL} ][ ACCESS_DENIED ]`);
          }
        } catch (error) {
          console.error(error);
          res
            .status(500)
            .send(`[ ${this.constructor.name} ][ URL: ${URL} ][ ERROR_MESSAGE: ${getErrorMessage(error)} ]`);
        }
      },
    );
  }

  protected channel(): void {
    const URL = `/${this.name}/channel`;

    this.router.post(
      URL,
      passport.authenticate("jwt", { session: false }),
      async (req: express.Request, res: express.Response) => {
        try {
          if (this.ACL.channel.length === 0 || (req.user && this.ACL.channel.includes(req.user.group))) {
            const { action, channelName, wsid } = req.body;

            if (action === "on") {
              this.channels.on(channelName, req.user.id, wsid);

              res.status(200).json({});
            } else if (action === "off") {
              this.channels.off(channelName, req.user.id, wsid);

              res.status(200).json({});
            } else {
              res.status(404).send(`[ ${this.constructor.name} ][ URL: ${URL} ][ UNEXPECTED_ACTION: ${action} ]`);
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
}
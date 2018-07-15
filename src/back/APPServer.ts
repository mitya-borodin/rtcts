import * as bodyParser from "body-parser";
import chalk from "chalk";
import * as express from "express";
import * as http from "http";
import { AddressInfo } from "net";
import * as passport from "passport";
import { isString } from "../utils/isType";
import { IAppConfig } from "./interfaces/IAppConfig";
import { IAuthStrategy } from "./interfaces/IAuthStrategy";

export class APPServer {
  private wasRun: boolean;
  private config: IAppConfig;
  private authStrategy: IAuthStrategy;
  private app: express.Application;
  private WSMidelware: (req: express.Request, res: express.Response, next: express.NextFunction) => void;
  private migrationRouter: express.Router;
  private services: (app: express.Application) => void;
  private server: http.Server;

  constructor(
    config: IAppConfig,
    authStrategy: IAuthStrategy,
    WSMidelware: (req: express.Request, res: express.Response, next: express.NextFunction) => void,
    migrationRouter: express.Router,
    services: (app: express.Application) => void,
  ) {
    this.wasRun = false;
    this.config = config;
    this.authStrategy = authStrategy;
    this.app = express();
    this.WSMidelware = WSMidelware;
    this.migrationRouter = migrationRouter;
    this.services = services;
    this.server = http.createServer(this.app);
  }

  public run(): void {
    if (!this.wasRun) {
      passport.use(this.authStrategy.getStrategy());

      this.app.use(bodyParser.json());
      this.app.use(passport.initialize());
      this.app.use(this.WSMidelware);

      if (!this.config.production) {
        this.app.use(this.migrationRouter);
      }

      this.services(this.app);

      this.app.use((req: express.Request, res: express.Response) => {
        res.status(404).send("Not found.");
      });

      this.server.listen(this.config.server.port, this.config.server.host, () => {
        const addressInfo: AddressInfo | string = this.server.address();

        if (!isString(addressInfo)) {
          console.log(chalk.blueBright.bold(`[ APP ][ SERVER ][ RUN ][ http://localhost:${addressInfo.port} ]`));
        }
      });
    }
  }
}

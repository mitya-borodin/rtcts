import { isString } from "@borodindmitriy/utils";
import * as bodyParser from "body-parser";
import chalk from "chalk";
import express from "express";
import * as http from "http";
import { AddressInfo } from "net";
import passport from "passport";
import { IAppConfig } from "./interfaces/IAppConfig";
import { IAPPServer } from "./interfaces/IAPPServer";
import { IAuthStrategy } from "./interfaces/IAuthStrategy";

export class APPServer<C extends IAppConfig = IAppConfig, STR extends IAuthStrategy = IAuthStrategy>
  implements IAPPServer {
  private wasRun: boolean;
  private config: C;
  private authStrategy: STR;
  private app: express.Application;
  private WSMidelware: (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => void;
  private migrationRouter: express.Router;
  private services: (app: express.Application) => void;
  private server: http.Server;

  constructor(
    config: C,
    authStrategy: STR,
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

  public async run(): Promise<void> {
    try {
      await new Promise((resolve, reject) => {
        try {
          if (!this.wasRun) {
            try {
              passport.use(this.authStrategy.getStrategy());

              this.app.use(bodyParser.json());
              this.app.use(passport.initialize());
              this.app.use(this.WSMidelware);

              if (!this.config.production) {
                this.app.use(this.migrationRouter);
              }

              this.services(this.app);

              this.app.use((req: express.Request, res: express.Response) => {
                res.status(404).send("Route Not found.");
              });

              this.server.listen(this.config.server.port, this.config.server.host, () => {
                const addressInfo: AddressInfo | string | null = this.server.address();

                if (!isString(addressInfo) && addressInfo !== null) {
                  console.log(
                    chalk.blueBright.bold(
                      `[ APP ][ SERVER ][ RUN ][ http://${addressInfo.address}:${
                        addressInfo.port
                      } ]`,
                    ),
                  );
                }

                resolve();
              });
            } catch (error) {
              console.error(error);

              reject();
            }
          } else {
            resolve();
          }
        } catch (error) {
          console.error(error);

          reject(error);
        }
      });
    } catch (error) {
      console.error(error);

      return Promise.reject(error);
    }
  }
}

import { isString } from "@rtcts/utils";
import chalk from "chalk";
import Koa from "koa";
import Router from "koa-router";
import koaBody from "koa-body";
import koaLogger from "koa-logger";
import koaCompress from "koa-compress";
import { AddressInfo } from "net";
import { Config } from "./Config";

export class KoaServer {
  private haveBeenRun: boolean;
  private config: Config;
  private app: Koa;

  constructor(config: Config) {
    this.haveBeenRun = false;
    this.config = config;
    this.app = new Koa();
  }

  public setMiddleware(middleware: Koa.Middleware) {
    this.app.use(middleware);
  }

  public setRouter(router: Router) {
    this.app.use(router.routes());
    this.app.use(router.allowedMethods());
  }

  public async run(): Promise<void> {
    try {
      if (!this.haveBeenRun) {
        this.app.use(koaBody());

        if (!this.config.production) {
          this.app.use(koaLogger());
        }

        this.app.use(koaCompress());

        await new Promise((resolve) => {
          const httpServer = this.app.listen(
            this.config.server.port,
            this.config.server.host,
            () => {
              const addressInfo: AddressInfo | string | null = httpServer.address();

              if (!isString(addressInfo) && addressInfo !== null) {
                console.log(
                  chalk.blueBright.bold(
                    `Server has been run on: http://${addressInfo.address}:${addressInfo.port} `,
                  ),
                );
              }

              this.haveBeenRun = true;
              resolve();
            },
          );
        });
      }
    } catch (error) {
      console.error(error);
    }
  }
}

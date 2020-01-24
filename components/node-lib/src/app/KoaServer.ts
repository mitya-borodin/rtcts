import { isString } from "@rtcts/utils";
import chalk from "chalk";
import { Server } from "http";
import Koa from "koa";
import koaBody from "koa-body";
import koaCompress from "koa-compress";
import koaLogger from "koa-logger";
import Router from "koa-router";
import { AddressInfo } from "net";
import { Config } from "./Config";

export class KoaServer {
  private haveBeenRun: boolean;
  private config: Config;
  private httpServer: Server | undefined;
  private app: Koa;

  constructor(config: Config) {
    this.haveBeenRun = false;
    this.config = config;
    this.app = new Koa();
  }

  public setMiddleware(middleware: Koa.Middleware): void {
    this.app.use(middleware);
  }

  public setRouter(router: Router): void {
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
          this.httpServer = this.app.listen(
            this.config.server.port,
            this.config.server.host,
            () => {
              if (!this.httpServer) {
                return;
              }

              const addressInfo: AddressInfo | string | null = this.httpServer.address();

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

  public async stop(): Promise<void> {
    if (this.httpServer) {
      this.httpServer.close();
    }
  }
}

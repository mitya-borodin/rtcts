import { isString } from "@rtcts/utils";
import chalk from "chalk";
import { Server } from "http";
import Koa from "koa";
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
                  chalk.green.bold(
                    `[ HTTP ][ the connection is open at http://${addressInfo.address}:${addressInfo.port} ]`,
                  ),
                );
              }

              this.haveBeenRun = true;
              resolve(undefined);
            },
          );
        });
      }
    } catch (error) {
      console.error(error);
    }
  }

  public stop(): void {
    if (this.httpServer) {
      this.httpServer.close();
    }
  }
}

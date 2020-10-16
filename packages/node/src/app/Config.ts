import { isNumber } from "@rtcts/utils";
import chalk from "chalk";

export class Config {
  public readonly jwt: {
    readonly secretKey: string;
  };
  public readonly db: {
    readonly name: string;
    readonly url: string;
    readonly auth?: {
      readonly user: string;
      readonly password: string;
    };
  };
  public readonly server: {
    readonly host: string;
    readonly port: number;
  };
  public readonly ws: {
    readonly host: string;
    readonly port: number;
  };
  public readonly production: boolean;

  constructor() {
    this.production = process.env.NODE_ENV === "production";

    if (!this.production) {
      console.log("");
      console.log(chalk.cyan.bold("[ APP_CONFIG ]"));
      console.log(
        chalk.cyan.bold("production:    "),
        chalk.cyan(`${process.env.NODE_ENV === "production"}`),
      );
      console.log(chalk.cyan.bold("jwt.secret_key: "), chalk.cyan(`${process.env.JWT_SECRET_KEY}`));
      console.log(chalk.cyan.bold("db.name: "), chalk.cyan(`${process.env.DB}`));
      console.log(chalk.cyan.bold("db.url: "), chalk.cyan(`${process.env.DB_URL}`));
      console.log(chalk.cyan.bold("db.user: "), chalk.cyan(`${process.env.DB_USER}`));
      console.log(chalk.cyan.bold("db.password: "), chalk.cyan(`${process.env.DB_PASSWORD}`));
      console.log(chalk.cyan.bold("server.host: "), chalk.cyan(`${process.env.SERVER_HOST}`));
      console.log(chalk.cyan.bold("server.port: "), chalk.cyan(`${process.env.SERVER_PORT}`));
      console.log(chalk.cyan.bold("ws.host: "), chalk.cyan(`${process.env.WS_HOST}`));
      console.log(chalk.cyan.bold("ws.port: "), chalk.cyan(`${process.env.WS_PORT}`));
      console.log("");
    }

    const name = process.env.DB || "test";
    const url = process.env.DB_URL || "mongodb://localhost:27017";
    const user = process.env.DB_USER;
    const password = process.env.DB_PASSWORD;

    this.db = {
      name,
      url,
      ...(user && password ? { auth: { user, password } } : {}),
    };

    this.server = {
      host: process.env.SERVER_HOST || "localhost",
      port: isNumber(Number(process.env.SERVER_PORT)) ? Number(process.env.SERVER_PORT) : 10000,
    };

    this.ws = {
      host: process.env.WS_HOST || "localhost",
      port: isNumber(Number(process.env.WS_PORT)) ? Number(process.env.WS_PORT) : 10001,
    };

    this.jwt = {
      secretKey: process.env.JWT_SECRET_KEY || "JWT_SECRET_KEY",
    };
  }
}

import chalk from "chalk";
import { Db, MongoClient } from "mongodb";
import { IAppConfig } from "./interfaces/IAppConfig";
import { IDBConnection } from "./interfaces/IDBConnection";

export class DBConnection implements IDBConnection {
  protected client: MongoClient | undefined;
  protected DB: Db | undefined;
  protected config: IAppConfig;

  constructor(config: IAppConfig) {
    this.config = config;
  }

  public async connection(): Promise<Db> {
    this.client = await MongoClient.connect(this.config.db.url);
    this.DB = this.client.db(this.config.db.name);

    console.log(
      chalk.blueBright.bold(`[ DB ][ CONNECTION ][ ESTABLISHED ][ ${this.config.db.url}/${this.config.db.name} ]`),
    );

    process.once("beforeExit", async (code) => {
      await this.disconnect();

      console.log(chalk.yellowBright.bold(`[ DB ][ CONNECTION ][ CLOSE ] Process exit with code: ${code};`));
    });

    await this.DB.executeDbAdminCommand({ setFeatureCompatibilityVersion: "3.6" });

    return this.DB;
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();

      this.client = undefined;
      this.DB = undefined;

      console.log(
        chalk.redBright.bold(`[ DB ][ CONNECTION ][ CLOSE ][ ${this.config.db.url}/${this.config.db.name} ]`),
      );
    }
  }

  public async getDB(): Promise<Db> {
    if (this.DB) {
      return this.DB;
    }

    return await this.connection();
  }
}

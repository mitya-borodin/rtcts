import chalk from "chalk";
import { Db, MongoClient } from "mongodb";
import { IAppConfig } from "./interfaces/IAppConfig";
import { IDBConnection } from "./interfaces/IDBConnection";

export class DBConnection implements IDBConnection<Db> {
  protected client: MongoClient | undefined;
  protected DB: Db | undefined;
  protected config: IAppConfig;

  constructor(config: IAppConfig) {
    this.config = config;
  }

  public async connection(): Promise<Db> {
    try {
      this.client = await MongoClient.connect(
        this.config.db.url,
        { useNewUrlParser: true },
      );
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
    } catch (error) {
      console.error(error);

      return Promise.reject(error);
    }
  }

  public async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.close();

        this.client = undefined;
        this.DB = undefined;

        console.log(
          chalk.redBright.bold(`[ DB ][ CONNECTION ][ CLOSE ][ ${this.config.db.url}/${this.config.db.name} ]`),
        );
      }
    } catch (error) {
      console.error(error);

      return Promise.reject(error);
    }
  }

  public async getDB(): Promise<Db> {
    try {
      if (this.DB) {
        return this.DB;
      }

      return await this.connection();
    } catch (error) {
      console.error(error);

      return Promise.reject(error);
    }
  }
}

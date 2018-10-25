import chalk from "chalk";
import { Db, MongoClient } from "mongodb";
import { EventEmitter } from "../isomorphic/EventEmitter";
import { getErrorMessage } from "../utils/getErrorMessage";
import { IAppConfig } from "./interfaces/IAppConfig";
import { IDBConnection } from "./interfaces/IDBConnection";

enum Status {
  OPEN = "OPEN",
  CONNECTING = "CONNECTING",
  CLOSED = "CLOSED",
}

export class DBConnection extends EventEmitter implements IDBConnection<Db> {
  protected status: Status.OPEN | Status.CONNECTING | Status.CLOSED;
  protected client: MongoClient | undefined;
  protected DB: Db | undefined;
  protected config: IAppConfig;
  protected pingTimer: NodeJS.Timer;

  constructor(config: IAppConfig, reconnectTimeOut: number = 2000) {
    super();
    // DEPS
    this.config = config;

    // PROPS
    this.status = Status.CLOSED;

    // BINDS
    this.connect = this.connect.bind(this);
  }

  get name(): string {
    return this.constructor.name;
  }

  public async connect(): Promise<void> {
    if (this.status === Status.CLOSED) {
      console.log("");
      console.log(chalk.blue.bold(`[ ${this.name} ][ connect ][ TRY: ${this.config.db.url}/${this.config.db.name} ]`));

      this.status = Status.CONNECTING;

      try {
        this.client = await MongoClient.connect(
          this.config.db.url,
          { useNewUrlParser: true },
        );

        this.status = Status.OPEN;

        console.log(
          chalk.blue.bold(`[ ${this.name} ][ connect ][ ESTABLISHED: ${this.config.db.url}/${this.config.db.name} ]`),
        );

        // Если ошибок не возникло, то подписывается на события закрытия процесса;
        process.once("beforeExit", async (code) => {
          console.log(chalk.red.bold(`[ ${this.name} ][ connect ][ BEFORE_EXIT ][ CODE: ${code} ]`));

          await this.disconnect();
        });

        // Запускаем таймер который будет проверять имеется ли соединение с БД или нет.
        this.pingTimer = setInterval(async () => {
          // console.log("PING ", new Date());
          if (this.client && !this.client.isConnected()) {
            clearInterval(this.pingTimer);

            await this.disconnect();
            await this.connect();
          }
        }, 1000);
      } catch (error) {
        console.log(chalk.red.bold(`[ ${this.name} ][ connect ][ ERROR ][ ERROR_MESSAGE: ${getErrorMessage(error)} ]`));
      } finally {
        if (!(this.client instanceof MongoClient)) {
          console.log(chalk.yellow.bold(`[ ${this.name} ][ RECONNECT ][ WILL_THROUGHT: 2500 ms ]`));

          setTimeout(() => {
            this.status = Status.CLOSED;
            this.connect();
          }, 2500);
        }

        this.emit(this.status);
      }
    }
  }

  public async disconnect(): Promise<void> {
    try {
      console.log("");
      console.log(chalk.magenta.bold(`[ ${this.name} ][ disconnect ][ TRY ]`));

      if (this.client instanceof MongoClient) {
        await this.client.close();

        this.client = undefined;
        this.DB = undefined;

        console.log(
          chalk.magenta.bold(`[ ${this.name} ][ disconnect ][ CLOSED: ${this.config.db.url}/${this.config.db.name} ]`),
        );
      } else {
        console.log(chalk.magenta.bold(`[ ${this.name} ][ disconnect ][ ALREADY_CLOSED ]`));
      }
    } catch (error) {
      console.log(chalk.red.bold(`[ ${this.name} ][ disconnect ][ ERROR_MESSAGE: ${getErrorMessage(error)} ]`));
    } finally {
      if (this.status !== Status.CLOSED) {
        this.status = Status.CLOSED;
        this.emit(this.status);
      }
    }
  }

  public async getDB(): Promise<Db> {
    return new Promise<Db>(async (resolve, reject) => {
      try {
        if (this.DB instanceof Db) {
          resolve(this.DB);
        } else if (this.client instanceof MongoClient) {
          this.DB = this.client.db(this.config.db.name);

          await this.DB.executeDbAdminCommand({ setFeatureCompatibilityVersion: "3.6" });

          resolve(this.DB);
        } else {
          this.once(Status.OPEN, async () => {
            if (this.client instanceof MongoClient) {
              this.DB = this.client.db(this.config.db.name);

              await this.DB.executeDbAdminCommand({ setFeatureCompatibilityVersion: "3.6" });

              resolve(this.DB);
            } else {
              throw new Error(`connction object is not instanceof MongoClient`);
            }
          });

          await this.connect();
        }
      } catch (error) {
        console.error(`[ ${this.name} ][ getDB ][ ERROR_MESSAGE: ${getErrorMessage(error)} ]`);

        reject();
      }
    });
  }
}

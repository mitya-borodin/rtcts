import { getErrorMessage } from "@rtcts/utils";
import chalk from "chalk";
import EventEmitter from "eventemitter3";
import { Db, MongoClient } from "mongodb";
import { Config } from "../app/Config";

enum Status {
  OPEN = "OPEN",
  CONNECTING = "CONNECTING",
  CLOSED = "CLOSED",
}

export class MongoDBConnection extends EventEmitter {
  protected status: Status.OPEN | Status.CONNECTING | Status.CLOSED;
  protected pingTimer: NodeJS.Timer;

  protected config: Config;

  protected client: MongoClient | void;
  protected db: Db | undefined;

  constructor(config: Config) {
    super();

    this.status = Status.CLOSED;
    this.pingTimer = setInterval(() => null, 1000 * 1000);

    this.config = config;

    this.client = undefined;
    this.db = undefined;
  }

  get name(): string {
    return this.constructor.name;
  }

  public connect = async (): Promise<void> => {
    if (this.status === Status.CLOSED) {
      console.log("");
      console.log(
        chalk.green.bold(
          `[ ${this.name} ][ Started trying to connect on: ${this.config.db.url}/${this.config.db.name} ]`,
        ),
      );

      this.status = Status.CONNECTING;

      try {
        this.client = await MongoClient.connect(this.config.db.url, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        });

        this.status = Status.OPEN;

        console.log(
          chalk.green.bold(
            `[ ${this.name} ][ The connection is established on: ${this.config.db.url}/${this.config.db.name} ]`,
          ),
        );
        console.log("");

        // Если ошибок не возникло, то подписывается на события закрытия процесса;
        process.once("beforeExit", (code): void => {
          console.log(
            chalk.red.bold(`[ ${this.name} ][ connect ][ BEFORE_EXIT ][ CODE: ${code} ]`),
          );

          this.disconnect();
        });

        // Запускаем таймер который будет проверять имеется ли соединение с БД или нет.
        this.pingTimer = setInterval(() => {
          // console.log("PING ", new Date());
          if (this.client && !this.client.isConnected()) {
            clearInterval(this.pingTimer);

            (async (): Promise<void> => {
              await this.disconnect();
              await this.connect();
            })();
          }
        }, 1000);
      } catch (error) {
        console.log(
          chalk.red.bold(
            `[ ${this.name} ][ connect ][ ERROR ][ ERROR_MESSAGE: ${getErrorMessage(error)} ]`,
          ),
        );
      } finally {
        if (!(this.client instanceof MongoClient)) {
          console.log(
            chalk.yellow.bold(
              `[ ${this.name} ][ The reconnection will take place after: 2500 ms ]`,
            ),
          );

          setTimeout(() => {
            this.status = Status.CLOSED;
            this.connect();
          }, 2500);
        }

        this.emit(this.status);
      }
    }
  };

  public disconnect = async (): Promise<void> => {
    try {
      console.log("");
      console.log(chalk.magenta.bold(`[ ${this.name} ][ disconnect ][ TRY ]`));

      if (this.client instanceof MongoClient) {
        await this.client.close();

        this.client = undefined;
        this.db = undefined;

        console.log(
          chalk.magenta.bold(
            `[ ${this.name} ][ disconnect ][ CLOSED: ${this.config.db.url}/${this.config.db.name} ]`,
          ),
        );
      } else {
        console.log(chalk.magenta.bold(`[ ${this.name} ][ disconnect ][ ALREADY_CLOSED ]`));
      }
    } catch (error) {
      console.log(
        chalk.red.bold(
          `[ ${this.name} ][ disconnect ][ ERROR_MESSAGE: ${getErrorMessage(error)} ]`,
        ),
      );
    } finally {
      if (this.status !== Status.CLOSED) {
        this.status = Status.CLOSED;
        this.emit(this.status);
      }
    }
  };

  public getDB = async (): Promise<Db> => {
    return new Promise<Db>((resolve, reject): void => {
      try {
        if (this.db instanceof Db) {
          resolve(this.db);
        } else if (this.client instanceof MongoClient) {
          this.db = this.client.db(this.config.db.name);
          this.db
            .executeDbAdminCommand({ setFeatureCompatibilityVersion: "4.2" })
            .then(() => resolve(this.db))
            .catch(reject);
        } else {
          this.once(Status.OPEN, () => {
            if (this.client instanceof MongoClient) {
              this.db = this.client.db(this.config.db.name);
              this.db
                .executeDbAdminCommand({ setFeatureCompatibilityVersion: "4.2" })
                .then(() => resolve(this.db))
                .catch(reject);
            } else {
              throw new Error(`Connection object is not instanceof MongoClient`);
            }
          });

          this.connect();
        }
      } catch (error) {
        console.error(`[ ${this.name} ][ getDB ][ ERROR_MESSAGE: ${getErrorMessage(error)} ]`);

        reject(error);
      }
    });
  };
}

import { getErrorMessage, isNumber } from "@borodindmitriy/utils";
import * as bodyParser from "body-parser";
import * as express from "express";
import * as moment from "moment";
import { Collection, Db } from "mongodb";
import { IDBConnection } from "./interfaces/IDBConnection";
import { IMigration } from "./interfaces/IMigration";
import { IMigrationController } from "./interfaces/IMigrationController";

/* tslint:disable:object-literal-sort-keys */

export class MigrationController implements IMigrationController {
  public router: express.Router;

  private secret: string;
  private connection: IDBConnection<Db>;
  private collection: Collection | undefined;
  private validator: object = {
    $jsonSchema: {
      bsonType: "object",
      properties: {
        name: {
          bsonType: "string",
          description: "Имя коллекции.",
        },
        version: {
          bsonType: "number",
          description: "Версия миграции.",
        },
        date: {
          bsonType: "date",
          description: "Дата миграции.",
        },
      },
    },
  };
  private migrations: IMigration[];

  constructor(connection: IDBConnection<Db>, secret: string) {
    this.connection = connection;
    this.secret = secret;
    this.router = express.Router();
    this.migrations = [];

    this.run = this.run.bind(this);

    this.router.use(bodyParser.urlencoded({ extended: false }));
    this.router.post("/migration", this.run);
  }

  public addMigration(migrations: IMigration[]): void {
    this.migrations = [...this.migrations, ...migrations];
  }

  private async getCollection(): Promise<Collection | void> {
    const db: Db = await this.connection.getDB();

    if (!this.collection) {
      this.collection = await db.createCollection("migrations", {
        validator: this.validator,
        validationLevel: "strict",
        validationAction: "error",
      });
    }

    return this.collection;
  }

  private async run(req: express.Request, res: express.Response): Promise<void> {
    const { name, secret } = req.body;
    const version = Number(req.body.version);

    if (isNumber(version)) {
      if (this.secret === secret) {
        try {
          const collection = await this.getCollection();

          if (collection) {
            let list = this.migrations
              .filter((m) => m.name === name)
              .sort((a, b) => (a.version > b.version ? 1 : -1));
            let curVersion = 0;
            const curMigration: IMigration | null = await collection.findOne({ name });

            if (curMigration) {
              curVersion = curMigration.version;
            }

            if (version > curVersion) {
              list = list.filter((m) => m.version > curVersion && m.version <= version);

              if (list.length > 0) {
                try {
                  for (const m of list) {
                    await m.forward();
                  }

                  await collection.findOneAndUpdate(
                    { name },
                    { $set: { name, version, date: new Date() } },
                    { upsert: true },
                  );

                  res
                    .status(200)
                    .send(
                      `[ MIGRATION_DONE ] \n` +
                        `[ NAME: ${name} ] \n` +
                        `[ TARGET_VERSION: ${version}, CURRENT_VERSION: ${curVersion} ] \n` +
                        `[ DATE: ${moment().format("YYYY-MM-DD HH:mm:ss ZZ")} ]`,
                    );
                } catch (error) {
                  res
                    .status(500)
                    .send(
                      `[ MIGRATION_FILED ] \n` +
                        `[ NAME: ${name} ] \n` +
                        `[ TARGET_VERSION: ${version}, CURRENT_VERSION: ${curVersion} ] \n` +
                        `[ DATE: ${moment().format("YYYY-MM-DD HH:mm:ss ZZ")} ] \n` +
                        `[ ERROR: ${getErrorMessage(error)} ]`,
                    );
                }
              } else {
                res
                  .status(404)
                  .send(
                    `[ MIGRATIONS_NOT_FOUND ] \n` +
                      `[ NAME: ${name} ] \n` +
                      `[ TARGET_VERSION: ${version}, CURRENT_VERSION: ${curVersion} ] \n` +
                      `[ DATE: ${moment().format("YYYY-MM-DD HH:mm:ss ZZ")} ]`,
                  );
              }
            }

            if (version < curVersion) {
              list = list.filter((m) => m.version <= curVersion && m.version >= version + 1);

              if (list.length > 0) {
                try {
                  for (const m of list) {
                    await m.rollBack();
                  }

                  await collection.findOneAndUpdate(
                    { name },
                    { $set: { name, version, date: new Date() } },
                    { upsert: true },
                  );

                  res
                    .status(200)
                    .send(
                      `[ ROLLBACK_DONE ] \n` +
                        `[ NAME: ${name} ] \n` +
                        `[ TARGET_VERSION: ${version}, CURRENT_VERSION: ${curVersion} ] \n` +
                        `[ DATE: ${moment().format("YYYY-MM-DD HH:mm:ss ZZ")} ]`,
                    );
                } catch (error) {
                  res
                    .status(500)
                    .send(
                      `[ ROLLBACK_FILED ] \n` +
                        `[ NAME: ${name} ] \n` +
                        `[ TARGET_VERSION: ${version}, CURRENT_VERSION: ${curVersion} ] \n` +
                        `[ DATE: ${moment().format("YYYY-MM-DD HH:mm:ss ZZ")} ] \n` +
                        `[ ERROR: ${getErrorMessage(error)} ]`,
                    );
                }
              } else {
                res
                  .status(404)
                  .send(
                    `[ ROLLBACKS_NOT_FOUND ] \n` +
                      `[ NAME: ${name} ] \n` +
                      `[ TARGET_VERSION: ${version}, CURRENT_VERSION: ${curVersion} ] \n` +
                      `[ DATE: ${moment().format("YYYY-MM-DD HH:mm:ss ZZ")} ]`,
                  );
              }
            }

            if (version === curVersion) {
              res
                .status(200)
                .send(
                  `[ ALREDY HERE ] \n` +
                    `[ NAME: ${name} ] \n` +
                    `[ TARGET_VERSION: ${version}, CURRENT_VERSION: ${curVersion} ] \n` +
                    `[ DATE: ${moment().format("YYYY-MM-DD HH:mm:ss ZZ")} ] \n`,
                );
            }
          }
        } catch (error) {
          res
            .status(500)
            .send(
              `[ MIGRATION_CONTROLLER_ERROR ] \n` +
                `[ NAME: ${name} ] \n` +
                `[ TARGET_VERSION: ${version} ] \n` +
                `[ DATE: ${moment().format("YYYY-MM-DD HH:mm:ss ZZ")} ] \n` +
                `[ ERROR: ${getErrorMessage(error)} ]`,
            );
        }
      } else {
        res
          .status(403)
          .send(`[ ACCESS DENYED ] \n` + `[ DATE: ${moment().format("YYYY-MM-DD HH:mm:ss ZZ")} ]`);
      }
    } else {
      res
        .status(500)
        .send(
          `[ VERSION_INVALID ] \n` +
            `[ NAME: ${name} ] \n` +
            `[ TARGET_VERSION: ${version} ] \n` +
            `[ DATE: ${moment().format("YYYY-MM-DD HH:mm:ss ZZ")} ]`,
        );
    }
  }
}

/* tslint:enable:object-literal-sort-keys */

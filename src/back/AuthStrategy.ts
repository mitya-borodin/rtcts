import { Strategy } from "passport-jwt";
import { Strategy as PassportStrategy } from "passport-strategy";
import { IPersist } from "../interfaces/IPersist";
import { IUser } from "../interfaces/IUser";
import { IAppConfig } from "./interfaces/IAppConfig";
import { IAuthStrategy } from "./interfaces/IAuthStrategy";
import { IUserModel } from "./interfaces/IUserModel";

/*
 * Эта функция определяет авторизован ты или нет.
 * В token записан ObjectId пользователя и как только происходит запрос к роуту с миделварой для проверки
 * то выполняется этот callBack и проиходит запрос в БД на предмет посика пользователя по ObjectId.
 * */

export class AuthStrategy<P extends IUser & IPersist, M extends IUserModel<P>, AC extends IAppConfig>
  implements IAuthStrategy {
  protected readonly strategy: PassportStrategy;

  constructor(config: AC, userModel: M) {
    this.strategy = new Strategy(
      {
        jwtFromRequest: config.jwt.form_request,
        secretOrKey: config.jwt.secret_key,
      },
      (jwtPayload, next) => {
        userModel
          .readById(jwtPayload.id)
          .then((user) => next(null, user))
          .catch(() => next(null, false));
      },
    );
  }

  public getStrategy(): PassportStrategy {
    return this.strategy;
  }
}

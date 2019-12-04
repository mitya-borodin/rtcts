/* eslint-disable @typescript-eslint/interface-name-prefix */
import { Strategy as PassportStrategy } from "passport-strategy";

export interface IAuthStrategy {
  getStrategy(): PassportStrategy;
}

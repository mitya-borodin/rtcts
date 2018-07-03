import { JwtFromRequestFunction } from "passport-jwt";

export interface IAppConfig {
  jwt: {
    form_request: JwtFromRequestFunction;
    secret_key: string;
  };
  db: {
    name: string;
    url: string;
  };
  server: {
    host: string;
    port: number;
  };
  ws: {
    host: string;
    port: number;
  };
  production: boolean;
}

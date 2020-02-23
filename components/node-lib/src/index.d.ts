/* eslint-disable @typescript-eslint/no-explicit-any */
import Koa from "koa";
import { Files } from "formidable";

declare module "koa" {
  interface Request extends Koa.BaseRequest {
    wsid: string;
    user: any | null;
    body: { [key: string]: any };
    files: Files;
  }
}

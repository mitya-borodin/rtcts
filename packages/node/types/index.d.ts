/* eslint-disable no-unused-vars */
import { Files } from "formidable";
import type Koa from "koa";

declare module "koa" {
  interface Request extends Koa.BaseRequest {
    wsid: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    user: any | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body: { [key: string]: any };
    files: Files;
  }
}

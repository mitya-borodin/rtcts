import type Koa from "koa";
import { Files } from "formidable";

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

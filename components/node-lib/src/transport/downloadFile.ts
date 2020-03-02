/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "fs";
import Koa from "koa";
import { promisify } from "util";

const exists = promisify(fs.exists);
const stat = promisify(fs.stat);

export const downloadFile = async (ctx: Koa.Context, sourceFilePath: string): Promise<void> => {
  if (!(await exists(sourceFilePath))) {
    ctx.throw(500, `Source file (${sourceFilePath}) isn't exist`);
  }

  const fileStat = await stat(sourceFilePath);

  if (fileStat.isDirectory()) {
    ctx.throw(400, `Source file (${sourceFilePath}) is directory`);
  }

  ctx.res.setHeader("Content-Length", fileStat.size);

  // ! Request
  ctx.req.on("error", (error: Error): void => {
    ctx.throw(500, error);
  });

  ctx.req.on("abort", () => {
    ctx.throw(500, new Error("Request has been aborted by the client."));
  });

  ctx.req.on("aborted", () => {
    ctx.throw(500, new Error("Request has been aborted."));
  });

  // ! Response
  ctx.res.on("error", (error: Error): void => {
    ctx.throw(500, error);
  });

  const sourceStream = fs.createReadStream(sourceFilePath);

  sourceStream.on("error", ctx.onerror);

  ctx.body = sourceStream;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "fs";
import Koa from "koa";
import { promisify } from "util";

const exists = promisify(fs.exists);
const stat = promisify(fs.stat);

export const downloadFile = async (ctx: Koa.Context, sourceFilePath: string): Promise<void> => {
  if (!(await exists(sourceFilePath))) {
    ctx.throw(`Source file (${sourceFilePath}) isn't exist`, 500);
  }

  const fileStat = await stat(sourceFilePath);

  if (fileStat.isDirectory()) {
    ctx.throw(`Source file (${sourceFilePath}) is directory`, 400);
  }

  ctx.res.setHeader("Content-Type", "application/javascript");
  ctx.res.setHeader("Content-Length", fileStat.size);

  return new Promise((resolve, reject) => {
    // ! Request
    ctx.req.on("error", (error: Error): void => {
      reject(error);
    });

    ctx.req.on("abort", () => {
      reject(new Error("Request has been aborted by the client."));
    });

    ctx.req.on("aborted", () => {
      reject(new Error("Request has been aborted."));
    });

    // ! Response
    ctx.res.on("error", (error: Error): void => {
      reject(error);
    });

    ctx.res.on("finish", () => {
      resolve();
    });

    const sourceStream = fs.createReadStream(sourceFilePath);

    sourceStream.on("error", (error: Error): void => {
      reject(error);
    });

    sourceStream.pipe(ctx.res);
  });
};

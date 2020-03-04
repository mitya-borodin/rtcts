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

  try {
    ctx.set("Accept-Ranges", "bytes");
    ctx.set("Cache-Control", "no-transform");
    ctx.length = fileStat.size;
    ctx.lastModified = fileStat.mtime;
    ctx.body = fs.createReadStream(sourceFilePath);
  } catch (error) {
    ctx.throw(500, error);
  }
};

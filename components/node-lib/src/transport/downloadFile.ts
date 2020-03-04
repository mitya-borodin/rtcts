/* eslint-disable @typescript-eslint/no-explicit-any */
import { fromStream } from "file-type";
import fs from "fs";
import Koa from "koa";
import path from "path";
import crypto from "crypto";
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
    const fileType = await fromStream(fs.createReadStream(sourceFilePath));

    if (fileType) {
      const fileName = path.basename(sourceFilePath);
      const fileExtension = path.extname(sourceFilePath);
      const fileNameWithOutExt = fileName.replace(fileExtension, "");

      ctx.attachment(`${fileNameWithOutExt}.${fileType.ext}`);
      ctx.type = fileType.mime;
    } else {
      ctx.attachment(path.basename(sourceFilePath));
    }

    ctx.set("Accept-Ranges", "bytes");
    ctx.set("Cache-Control", "no-transform");
    ctx.length = fileStat.size;
    ctx.lastModified = fileStat.mtime;
    ctx.etag = crypto
      .createHash("md5")
      .update(
        `${fileStat.mtime.toUTCString()} - ${path.basename(sourceFilePath)} - ${String(
          fileStat.size,
        )}`,
      )
      .digest("hex");

    ctx.body = fs.createReadStream(sourceFilePath);
  } catch (error) {
    ctx.throw(500, error);
  }
};

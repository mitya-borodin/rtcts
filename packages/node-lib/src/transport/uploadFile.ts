/* eslint-disable @typescript-eslint/no-explicit-any */
import { isNumber } from "@rtcts/utils";
import fs from "fs";
import Koa from "koa";
import path from "path";
import typeIs from "type-is";
import { promisify } from "util";
import { SizeControllerStream } from "./SizeControllerStream";

const exists = promisify(fs.exists);

export const uploadFile = async (
  ctx: Koa.Context,
  destinationDirectory: string,
  fileName: string,
  config = {
    maxFileSize: 10 * 1024 * 1024, // 10 mb
    mimeTypes: ["image/gif", "image/jpeg", "image/pjpeg", "image/png", "image/webp", "image/heic"],
  },
): Promise<void> => {
  if (!(await exists(destinationDirectory))) {
    ctx.throw(500, `Destination directory (${destinationDirectory}) isn't exist`);
  }

  if (await exists(path.resolve(destinationDirectory, fileName))) {
    ctx.throw(500, `File (${fileName}) already exist in (${destinationDirectory})`);
  }

  // * Getting Headers
  const contentLength = parseInt(ctx.req.headers["content-length"] || "0");
  const mimeType = ctx.req.headers["content-type"];

  if (!isNumber(contentLength) || (isNumber(contentLength) && contentLength === 0)) {
    ctx.throw(500, `Content-Light must be Number and more then zero`);
  }

  if (contentLength > config.maxFileSize) {
    ctx.throw(
      413,
      `Content-Light (${contentLength}) more then max file size (${config.maxFileSize})`,
    );
  }

  if (
    Array.isArray(config.mimeTypes) &&
    config.mimeTypes.length > 0 &&
    !typeIs(ctx.req, config.mimeTypes)
  ) {
    ctx.throw(422, `Mime type (${mimeType}) does not match valid values (${config.mimeTypes})`);
  }

  return new Promise((resolve, reject) => {
    ctx.req.on("error", (error: Error): void => {
      reject(error);
    });

    ctx.res.on("error", (error: Error): void => {
      reject(error);
    });

    ctx.req.on("abort", () => {
      reject(new Error("Request has been aborted by the client."));
    });

    ctx.req.on("aborted", () => {
      reject(new Error("Request has been aborted."));
    });

    // * Green Zone
    const sizeControllerStream = new SizeControllerStream();

    sizeControllerStream.on("progress", () => {
      if (sizeControllerStream.bytes > config.maxFileSize) {
        ctx.throw(
          500,
          `More data is received (${contentLength}) than is allowed (${config.maxFileSize})`,
        );
      }
    });

    const destinationStream = fs.createWriteStream(path.resolve(destinationDirectory, fileName));

    destinationStream.on("finish", () => {
      resolve();
    });

    destinationStream.on("error", (error: Error): void => {
      reject(error);
    });

    ctx.req.pipe(sizeControllerStream).pipe(destinationStream);
  });
};

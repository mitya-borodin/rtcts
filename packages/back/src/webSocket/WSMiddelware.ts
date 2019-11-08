import * as express from "express";

export function WSMiddelware(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  req.body.wsid = req.headers["x-ws-id"];

  next();
}

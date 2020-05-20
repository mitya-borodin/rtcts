import { logTypeEnum } from "./logTypeEnum";

export type LogType =
  | logTypeEnum.log
  | logTypeEnum.info
  | logTypeEnum.success
  | logTypeEnum.warning
  | logTypeEnum.error
  | logTypeEnum.validating;

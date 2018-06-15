import * as crypto from "crypto";

export function encryptPassword(password: string, salt: string): string {
  try {
    return crypto.createHmac("sha256", salt).update(password).digest("hex");
  } catch (err) {
    return "";
  }
}

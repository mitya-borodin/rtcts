import { encryptPassword } from "./encryptPassword";

export function authenticate(
  password: string,
  salt: string,
  hashedPassword: string,
): boolean {
  return encryptPassword(password, salt) === hashedPassword;
}

export function checkPassword(password: string, password_confirm: string): boolean {
  return password === password_confirm;
}

export function checkPassword(password: string, password_confirm: string): boolean {
  if (password === password_confirm) {
    return /^[A-Za-z0-9\!@\$%_&+\*\(\)\-]{3,128}$/.test(password);
  } else {
    return false;
  }
}

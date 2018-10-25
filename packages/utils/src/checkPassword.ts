export function checkPassword(password: string, passwordConfirm: string): boolean {
  if (password === passwordConfirm) {
    return /^[A-Za-z0-9\!@\$%_&+\*\(\)\-]{3,128}$/.test(password);
  } else {
    return false;
  }
}

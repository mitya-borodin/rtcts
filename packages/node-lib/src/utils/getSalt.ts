export function getSalt(): string {
  return `${Math.round(new Date().valueOf() * Math.random())}`;
}

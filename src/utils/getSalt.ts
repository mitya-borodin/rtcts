export function getSalt() {
  return `${Math.round( ( new Date().valueOf() * Math.random() ) )}`;
}

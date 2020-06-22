import { TransformCallback, Transform } from "stream";

export class SizeControllerStream extends Transform {
  public bytes = 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // eslint-disable-next-line no-underscore-dangle
  _transform(chunk: Buffer, encoding: string, callback: TransformCallback): void {
    this.bytes += chunk.length;

    this.push(chunk);
    this.emit("progress");

    callback();
  }
}

import { TransformCallback, Transform } from "stream";

export class SizeControllerStream extends Transform {
  public bytes = 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _transform(chunk: any, encoding: string, callback: TransformCallback): void {
    this.bytes += chunk.length;

    this.push(chunk);
    this.emit("progress");

    callback();
  }
}

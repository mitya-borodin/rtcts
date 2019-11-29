export class EventEmitter {
  private subscriptions: Map<string, Set<(payload: any) => void>>;

  constructor() {
    this.subscriptions = new Map();

    this.emit = this.emit.bind(this);
    this.once = this.once.bind(this);
    this.on = this.on.bind(this);
    this.off = this.off.bind(this);
    this.has = this.has.bind(this);
    this.clear = this.clear.bind(this);
  }

  get listenersCount(): number {
    return this.subscriptions.size;
  }

  public emit(name: string, payload?: any): void {
    const listeners = this.subscriptions.get(name);

    if (listeners) {
      listeners.forEach((cb) => cb(payload));
    }
  }

  public once(name: string, callBack: any): void {
    const cb = (...args: any[]): void => {
      callBack(...args);
      this.off(name, cb);
    };

    this.on(name, cb);
  }

  public has(name: string, callBack: any): boolean {
    const listeners = this.subscriptions.get(name);

    if (listeners) {
      return listeners.has(callBack);
    }

    return false;
  }

  public on(name: string, callBack: any): void {
    const listeners = this.subscriptions.get(name);

    if (listeners) {
      if (!listeners.has(callBack)) {
        listeners.add(callBack);
      } else {
        console.warn(`[ ${this.constructor.name} ][ ON ][ ${name} ][ ALREADY_EXIST ]`);
      }
    } else {
      this.subscriptions.set(name, new Set([callBack]));
    }
  }

  public off(name: string, callBack: any): void {
    const listeners = this.subscriptions.get(name);

    if (listeners) {
      if (listeners.has(callBack)) {
        listeners.delete(callBack);
      } else {
        console.warn(`[ ${this.constructor.name} ][ OFF ][ ${name} ][ NOT_EXIST ]`);
      }
    } else {
      console.error(`[ ${this.constructor.name} ][ OFF ][ SUBSCRIPTION ][ ${name} ][ NOT_EXIST ]`);
    }
  }

  public clear(): void {
    this.subscriptions.forEach((list) => list.clear());
    this.subscriptions.clear();
  }
}

export interface IEventEmitter {
  listenersCount: number;

  emit(name: string, payload?: any): void;

  has(name: string, callBack: any): boolean;

  once(name: string, callBack: any): void;

  on(name: string, callBack: any): void;

  off(name: string, callBack: any): void;

  clear(): void;
}
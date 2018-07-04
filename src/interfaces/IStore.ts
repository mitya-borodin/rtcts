export interface IStore {
  loading: boolean;
  wasInit: boolean;
  assigment: (handler: () => any, emit: boolean) => void;
  receiveMessage: (message: any) => void;
  destroy: () => void;
}

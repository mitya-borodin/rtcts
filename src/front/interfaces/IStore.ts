export interface IStore {
  loading: boolean;
  wasInit: boolean;
  receiveMessage: (message: any) => void;
}

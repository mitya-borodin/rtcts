export type Send = (
  payload: {
    create?: any;
    update?: any;
    remove?: any;
    bulkCreate?: any;
    bulkUpdate?: any;
    bulkRemove?: any;
  },
  uid: string,
  wsid: string,
  excludeCurrentDevice: boolean,
) => void;

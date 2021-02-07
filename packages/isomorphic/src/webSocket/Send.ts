/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
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
  excludeRequestingDevice: boolean,
) => void;

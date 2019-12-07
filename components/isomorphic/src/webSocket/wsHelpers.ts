import { getErrorMessage, isObject, isString } from "@rtcts/utils";
import { ErrorChannel } from "./wsChannels";

export const makeErrorMessage = (
  message: string,
  payload: any,
): [string, { [key: string]: any }] => {
  return [ErrorChannel, { message: `[ ERROR ] ${message}`, payload }];
};

export const makeMessage = (channelName: string, payload: { [key: string]: any }): string => {
  if (!isString(channelName)) {
    return JSON.stringify(makeErrorMessage("ChannelName should be a string", { channelName }));
  }
  if (!isObject(payload)) {
    return JSON.stringify(makeErrorMessage("Payload should be a object", { channelName, payload }));
  }

  return JSON.stringify([channelName, payload]);
};

export const recognizeMessage = (message: string): [string, { [key: string]: any }] => {
  try {
    const data: [string, { [key: string]: any }] = JSON.parse(message);

    if (Array.isArray(data)) {
      const [channelName, payload] = data;

      if (!isString(channelName)) {
        throw new Error("ChannelName should be a channelName: string");
      }
      if (!isObject(payload)) {
        return makeErrorMessage("Payload should be a object", { channelName, payload });
      }

      return data;
    } else {
      throw new Error(
        "Message should include Array [channelName: string, payload: { [key: string]: any }]",
      );
    }
  } catch (error) {
    return makeErrorMessage(getErrorMessage(error), { error, receive_message: message });
  }
};

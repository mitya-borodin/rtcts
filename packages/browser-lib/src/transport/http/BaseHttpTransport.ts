import { userEventEnum } from "@rtcts/isomorphic";
import { isString } from "@rtcts/utils";
import EventEmitter from "eventemitter3";
import { WSClient } from "../ws/WSClient";

export interface BaseHttpTransportACL {
  subscribeToChannel: string[];
  unsubscribeFromChannel: string[];
}

export class BaseHttpTransport<
  WS extends WSClient = WSClient,
  PUB_SUB extends EventEmitter = EventEmitter
> {
  public currentUserGroup: string;

  protected name: string;
  protected ws: WS;
  protected channelName: string;
  public readonly ACL: BaseHttpTransportACL;
  protected pubSub: PUB_SUB;
  protected rootPath: string;

  constructor(
    name: string,
    ws: WS,
    channelName: string,
    ACL: BaseHttpTransportACL,
    pubSub: PUB_SUB,
    rootPath = "/api",
  ) {
    this.name = name.toLocaleLowerCase();
    this.ws = ws;
    this.channelName = channelName;
    this.ACL = ACL;
    this.pubSub = pubSub;
    this.rootPath = rootPath;

    this.pubSub.on(userEventEnum.SET_USER_GROUP, (currentUserGroup: string) => {
      if (isString(currentUserGroup)) {
        this.currentUserGroup = currentUserGroup;
      }
    });

    this.pubSub.on(userEventEnum.CLEAR_USER_GROUP, () => {
      this.currentUserGroup = "";
    });

    this.subscribeToChannel = this.subscribeToChannel.bind(this);
    this.unsubscribeFromChannel = this.unsubscribeFromChannel.bind(this);
    this.getHttpRequest = this.getHttpRequest.bind(this);
    this.postHttpRequest = this.postHttpRequest.bind(this);
    this.putHttpRequest = this.putHttpRequest.bind(this);
    this.deleteHttpRequest = this.deleteHttpRequest.bind(this);
    this.makeHttpRequest = this.makeHttpRequest.bind(this);
  }

  public async subscribeToChannel(): Promise<void> {
    try {
      if (!this.ACL.subscribeToChannel.includes(this.currentUserGroup)) {
        return;
      }

      await this.postHttpRequest(`/${this.name}/channel`, {
        channelName: this.channelName,
        action: "on",
      });
    } catch (error) {
      console.error(error);
    }
  }

  public async unsubscribeFromChannel(): Promise<void> {
    try {
      if (!this.ACL.unsubscribeFromChannel.includes(this.currentUserGroup)) {
        return;
      }

      await this.postHttpRequest(`/${this.name}/channel`, {
        channelName: this.channelName,
        action: "off",
      });
    } catch (error) {
      console.error(error);
    }
  }

  public async downloadFile(
    path: string,
    callBack: (receivedLength: number, contentLength: number) => void,
    options = {},
  ): Promise<void> {
    // Шаг 1: начинаем загрузку fetch, получаем поток для чтения
    const response = await fetch(
      this.rootPath + path,
      Object.assign(
        {
          headers: {
            "x-ws-id": this.ws.wsid,
          },
          method: "GET",
        },
        options,
      ),
    );

    if (response.body) {
      // Вместо response.json() и других методов
      const reader = response.body.getReader();

      // Шаг 2: получаем длину содержимого ответа
      let contentLength = 0;
      const contentLengthHeader = response.headers.get("Content-Length");

      if (contentLengthHeader) {
        contentLength = parseInt(contentLengthHeader);
      }

      // Шаг 3: считываем данные:
      let receivedLength = 0; // количество байт, полученных на данный момент
      const chunks: Uint8Array[] = []; // массив полученных двоичных фрагментов (составляющих тело ответа)

      // Бесконечный цикл, пока идёт загрузка
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        if (value) {
          chunks.push(value);
          receivedLength += value.length;
        }

        console.log(`Получено ${receivedLength} из ${contentLength}`);

        callBack(receivedLength, contentLength);
      }

      const blob = new Blob(chunks);

      console.log(`Получение завершено.`);
      console.log(`Получено: ${receivedLength} из ${contentLength}`);
      console.log(`Длинна Blob: ${blob.size}, ${blob.type}`);
      console.log(blob);
    }
  }

  public async uploadFile(
    path: string,
    body: Blob,
    callBack: (receivedLength: number, contentLength: number) => void,
    options = {},
  ): Promise<void> {
    // Шаг 1: начинаем загрузку fetch, получаем поток для чтения
    const response = await fetch(
      this.rootPath + path,
      Object.assign(
        {
          headers: {
            "x-ws-id": this.ws.wsid,
          },
          method: "PUT",
          body,
        },
        options,
      ),
    );

    if (response.body) {
      // Вместо response.json() и других методов
      const reader = response.body.getReader();

      // Шаг 2: получаем длину содержимого ответа
      const size = body.size;

      // Шаг 3: считываем данные:
      let sentLength = 0; // количество байт, полученных на данный момент

      // Бесконечный цикл, пока идёт загрузка
      while (true) {
        // done становится true в последнем фрагменте
        // value - Uint8Array из байтов каждого фрагмента
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        if (value) {
          sentLength += value.length;
        }

        console.log(`Отправлено ${sentLength} из ${size}`);

        callBack(sentLength, size);
      }

      console.log(`Отправка завершена.`);
      console.log(`Отправлено: ${sentLength} из ${size}`);
    }
  }

  protected async getHttpRequest(path: string, json = true, options = {}): Promise<any | void> {
    return await this.makeHttpRequest(path, "GET", {}, json, options);
  }

  protected async postHttpRequest(
    path: string,
    body?: object,
    json = true,
    options = {},
  ): Promise<any | void> {
    return await this.makeHttpRequest(path, "POST", body, json, options);
  }

  protected async putHttpRequest(
    path: string,
    body?: object,
    json = true,
    options = {},
  ): Promise<any | void> {
    return await this.makeHttpRequest(path, "PUT", body, json, options);
  }

  protected async deleteHttpRequest(
    path: string,
    body?: object,
    json = true,
    options = {},
  ): Promise<any | void> {
    return await this.makeHttpRequest(path, "DELETE", body, json, options);
  }

  private async makeHttpRequest(
    path = "",
    method = "GET",
    body?: object,
    json = true,
    options = {},
  ): Promise<any | void> {
    try {
      const res = await fetch(
        this.rootPath + path,
        Object.assign(
          {
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              "x-ws-id": this.ws.wsid,
            },
            method,
          },
          method === "GET" ? {} : { body: JSON.stringify(body) },
          options,
        ),
      );

      if (res.status === 200) {
        if (json) {
          return await res.json();
        }

        return await res.text();
      } else if (res.status === 404) {
        console.info(`[ ${this.constructor.name} ][ path: ${this.rootPath + path} ][ NOT_FOUND ]`);
      } else {
        console.error({
          status: res.status,
          statusText: res.statusText,
        });
      }
    } catch (error) {
      console.error(error);
    }
  }
}

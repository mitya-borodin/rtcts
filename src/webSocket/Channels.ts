import chalk from "chalk";
import { IChannels } from "../interfaces/IChannels";
import { IConnection } from "../interfaces/IConnection";
import { makeMessage } from "../WebSocket/helpers";
import { Connection } from "./Connection";

export class Channels implements IChannels {
  // Map<connectionID: string, Connection>
  private connections: Map<string, IConnection>;
  // Map<channelName: string, Map<connectionID: string, Connection>>
  private channels: Map<string, Map<string, IConnection>>;

  constructor() {
    this.connections = new Map();
    this.channels = new Map();
  }

  public addConnection(a_connection: IConnection): void {
    const id = a_connection.getConnectionID();
    const connection = this.connections.get(id);

    if (!connection) {
      this.connections.set(id, a_connection);

      console.log("");
      console.log(chalk.yellow(`[ CHANNELS ][ ADD_CONNECTION ]${id}`));
      console.log(chalk.yellow(`[ CHANNELS ][ ADD_CONNECTION ][ CONNECTION_COUNT ][ ${this.connections.size} ]`));
    } else {
      console.log("");
      console.log(chalk.redBright(`[ CHANNELS ][ ADD_CONNECTION ][ ERROR ][ ALLREADY_EXIST ] ${id}`));
    }
  }

  public deleteConnection(a_connection: IConnection): void {
    const id = a_connection.getConnectionID();
    const connection = this.connections.get(id);

    if (connection) {
      this.connections.delete(id);

      for (const chName of this.channels.keys()) {
        this.off(chName, connection.uid || "", connection.wsid);
      }

      console.log("");
      console.log(chalk.redBright(`[ CHANNELS ][ DELETE_CONNECTION ]${id}`));
      console.log(
        chalk.redBright.bold(`[ CHANNELS ][ DELETE_CONNECTION ][ CONNECTION_COUNT ][ ${this.connections.size} ]`),
      );
    } else {
      console.log("");
      console.log(chalk.redBright(`[ CHANNELS ][ DELETE_CONNECTION ][ ERROR ][ NOT_FOUND ] ${id}`));
    }
  }

  public on(chName: string, uid: string, wsid: string): void {
    const connectionID = Connection.getConnectionID(uid, wsid);
    const connection = this.connections.get(connectionID);

    let channel = this.channels.get(chName);

    if (channel) {
      if (connection) {
        channel.set(connectionID, connection);

        console.log("");
        console.log(chalk.yellow.bold(`[ CHANNELS ][ DONE_ON ][ LISTENERS ][ ${channel.size} ][ ON ][ ${chName} ]`));
      }
    } else {
      if (connection) {
        this.channels.set(chName, new Map());

        channel = this.channels.get(chName);

        if (channel) {
          channel.set(connectionID, connection);

          console.log("");
          console.log(
            chalk.yellow.bold(`[ CHANNELS ][ ADD_CHANNEL ][ LISTENERS ][ ${channel.size} ][ ON ][ ${chName} ]`),
          );
        }
      }
    }
  }

  public off(chName: string, uid: string, wsid: string): void {
    const channel = this.channels.get(chName);

    if (channel) {
      channel.delete(Connection.getConnectionID(uid, wsid));

      console.log("");
      console.log(chalk.red.bold(`[ CHANNELS ][ DONE_OFF ][ LISTENERS ][ ${channel.size} ][ ON ][ ${chName} ]`));
    } else {
      console.log("");
      console.log(chalk.redBright(`[ CHANNELS ][ OFF ][ ERROR ][ ${chName} ][ NOT_FOUND ]`));
    }
  }

  public send(
    chName: string,
    payload: { [key: string]: any },
    uid: string,
    wsid: string,
    excludeCurrentDevice = true,
  ): void {
    const message = makeMessage(chName, payload);
    const channel = this.channels.get(chName);

    if (channel) {
      for (const connection of channel.values()) {
        if (excludeCurrentDevice) {
          if (!connection.isItSelf(uid, wsid)) {
            connection.send(message);
          }
        } else {
          connection.send(message);
        }
      }
    } else {
      console.log("");
      console.log(chalk.redBright(`[ CHANNELS ][ SEND ][ ERROR ][ ${chName} ][ NOT_FOUND ]`));
    }
  }
}

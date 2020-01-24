import { makeMessage } from "@rtcts/isomorphic";
import chalk from "chalk";
import { Connection } from "./Connection";
import { isString } from "@rtcts/utils";

export class Channels<C extends Connection = Connection> {
  // Map<connectionID: string, Connection>
  private connections: Map<string, C>;

  // Map<channelName: string, Map<connectionID: string, Connection>>
  private channels: Map<string, Map<string, C>>;

  constructor() {
    this.connections = new Map();
    this.channels = new Map();

    this.addConnection = this.addConnection.bind(this);
    this.deleteConnection = this.deleteConnection.bind(this);
    this.on = this.on.bind(this);
    this.off = this.off.bind(this);
    this.send = this.send.bind(this);
  }

  public addConnection(connection: C): void {
    try {
      const connectionID = connection.getConnectionID();

      if (!this.connections.has(connectionID)) {
        this.connections.set(connectionID, connection);

        console.log(chalk.green(`[ CHANNELS ][ Connection with ID: ${connectionID} added ]`));
        console.log(
          chalk.green(`[ CHANNELS ][ Current number of connections ][ ${this.connections.size} ]`),
        );
      } else {
        console.warn(
          chalk.yellow(
            `[ CHANNELS ][ The connection with ID: ${connectionID} has already been added ]`,
          ),
        );
      }
    } catch (error) {
      console.error(error);
    }
  }

  public deleteConnection(connection: C): void {
    try {
      const connectionID = connection.getConnectionID();
      const curConnection = this.connections.get(connectionID);

      if (curConnection) {
        this.connections.delete(connectionID);

        for (const chName of this.channels.keys()) {
          if (isString(curConnection.uid)) {
            this.off(chName, curConnection.uid, curConnection.wsid);
          } else {
            console.warn(
              chalk.yellow(`[ CHANNELS ][ An attempt was made to add a connection without an ID ]`),
            );
          }
        }

        console.log(chalk.green(`[ CHANNELS ][ Connection with ID: ${connectionID} removed ]`));
        console.log(
          chalk.green(`[ CHANNELS ][ Current number of connections ][ ${this.connections.size} ]`),
        );
      } else {
        console.warn(chalk.yellow(`[ CHANNELS ][ Connection with ID: ${connectionID} not found ]`));
      }
    } catch (error) {
      console.error(error);
    }
  }

  public on(chName: string, uid: string, wsid: string): void {
    try {
      const connectionID = Connection.getConnectionID(uid, wsid);
      const connection = this.connections.get(connectionID);

      let channel = this.channels.get(chName);

      if (channel) {
        if (connection) {
          if (!channel.has(connectionID)) {
            channel.set(connectionID, connection);

            console.log(
              chalk.green(
                `[ CHANNELS ][ Added listener for channel: ${chName} ][ current number of listeners: ${channel.size} ]`,
              ),
            );
          }
        }
      } else {
        if (connection) {
          channel = new Map();
          channel.set(connectionID, connection);

          this.channels.set(chName, channel);

          console.log(
            chalk.green(
              `[ CHANNELS ][ Added listener for channel: ${chName} ][ current number of listeners: ${channel.size} ]`,
            ),
          );
        }
      }
    } catch (error) {
      console.error(error);
    }
  }

  public off(chName: string, uid: string, wsid: string): void {
    try {
      const connectionID = Connection.getConnectionID(uid, wsid);
      const channel = this.channels.get(chName);

      if (channel) {
        if (channel.has(connectionID)) {
          channel.delete(connectionID);

          console.log(
            chalk.green(
              `[ CHANNELS ][ Removed listener for channel: ${chName} ][ current number of listeners: ${channel.size} ]`,
            ),
          );
        }
      } else {
        console.log(chalk.yellow(`[ CHANNELS ][ Channel with name: ${chName} not found ]`));
      }
    } catch (error) {
      console.error(error);
    }
  }

  public send(
    chName: string,
    payload: {
      create?: object;
      update?: object;
      remove?: object;
      bulkCreate?: object[];
      bulkUpdate?: object[];
      bulkRemove?: object[];
    },
    uid: string,
    wsid: string,
    excludeCurrentDevice = true,
  ): void {
    try {
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
        console.log(chalk.yellow(`[ CHANNELS ][ Channel with name: ${chName} not found ]`));
      }
    } catch (error) {
      console.error(error);
    }
  }
}

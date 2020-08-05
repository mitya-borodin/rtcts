/* eslint-disable @typescript-eslint/require-await */
import { Entity } from "@rtcts/isomorphic";
import { getErrorMessage, isString } from "@rtcts/utils";
import { computed, runInAction } from "mobx";
import { ValueObjectFormStore } from "./ValueObjectFormStore";

export class EntityFormStore<ENTITY extends Entity, DATA> extends ValueObjectFormStore<
  ENTITY,
  DATA
> {
  @computed({ name: "FormStore.isEdit" })
  get isEdit(): boolean {
    return this.form instanceof this.Entity && this.form.hasId() && this.form.id.length > 0;
  }

  public async open(id?: string): Promise<void> {
    const hasID = isString(id) && id.length > 0;
    const title = `Open (${this.constructor.name}) has been open for ${
      hasID ? "update" : "create"
    } `;

    try {
      this.start();
      const form = await this.openForm(id);

      runInAction(`${title} succeed`, () => (this.form = form));
    } catch (error) {
      console.error(`${title} failed: ${getErrorMessage(error)}`);
    } finally {
      this.stop();
    }
  }

  protected async openForm(id?: string, ...args: any[]): Promise<ENTITY> {
    console.log(`External handler for open action (${this.constructor.name})`, {
      id,
    });

    return new this.Entity({ id });
  }
}

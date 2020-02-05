/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Entity, ValidateResult } from "@rtcts/isomorphic";
import { getErrorMessage, isString } from "@rtcts/utils";
import EventEmitter from "eventemitter3";
import { action, computed, observable, runInAction } from "mobx";

export class FormStore<
  CHANGE,
  ENTITY extends Entity<DATA, VA>,
  DATA,
  VA extends object = object
> extends EventEmitter {
  @observable
  public pending: boolean;
  @observable
  public showValidateResult: boolean;

  @observable
  public form: ENTITY | undefined;

  protected readonly Entity: new (data?: any) => ENTITY;

  constructor(Entity: new (data?: any) => ENTITY) {
    super();

    this.Entity = Entity;

    this.pending = false;
    this.showValidateResult = false;

    this.open = this.open.bind(this);
    this.change = this.change.bind(this);
    this.cancel = this.cancel.bind(this);
    this.submit = this.submit.bind(this);
  }

  @computed({ name: "FormStore.validateResult" })
  get validateResult(): ValidateResult {
    if (this.form instanceof this.Entity) {
      return this.form.validate();
    }

    return new ValidateResult([]);
  }

  @computed({ name: "FormStore.isValid" })
  get isValid(): boolean {
    return this.validateResult.isValid;
  }

  @computed({ name: "FormStore.isOpen" })
  get isOpen(): boolean {
    return this.form instanceof this.Entity;
  }

  @computed({ name: "FormStore.isEdit" })
  get isEdit(): boolean {
    return this.form instanceof this.Entity && isString(this.form.id) && this.form.id.length > 0;
  }

  public async open(id?: string): Promise<void> {
    const hasID = isString(id) && id.length > 0;
    const title = `${this.constructor.name} is open for ${hasID ? "update" : "create"} `;

    try {
      this.start();
      const form = await this.openForm(id);

      runInAction(title, () => (this.form = form));
    } catch (error) {
      console.error(`${title} failed: ${getErrorMessage(error)}`);
    } finally {
      this.stop();
    }
  }

  public async change(change: CHANGE): Promise<void> {
    const title = `${this.constructor.name} has been changed`;

    try {
      this.start();

      if (this.form instanceof this.Entity) {
        const form = await this.changeForm(this.form, change);

        runInAction(title, () => (this.form = form));
      } else {
        throw new Error(`Try change on closed form`);
      }
    } catch (error) {
      console.error(`${title} failed: ${getErrorMessage(error)}`);
    } finally {
      this.stop();
    }
  }

  @action("FormStore.submit")
  public async submit(): Promise<void> {
    try {
      this.start();

      if (this.isValid) {
        this.hideValidation();

        if (this.form instanceof this.Entity) {
          await this.submitForm(this.form);

          this.cancel();
        } else {
          throw new Error(`FORM_IS_NOT_INSTANCE_OF ${this.Entity.name}`);
        }
      } else {
        this.showValidation();

        throw new Error(`FORM_IS_NOT_VALID`);
      }
    } catch (error) {
      console.error(`[ ${this.constructor.name} ][ SUBMIT ][ ${getErrorMessage(error)} ]`);
    } finally {
      this.stop();
    }
  }

  public cancel(): void {
    runInAction(`[ ${this.constructor.name} ][ CANCEL ]`, () => {
      this.pending = false;
      this.form = undefined;

      this.hideValidation();
    });
  }

  protected start(): void {
    runInAction(`[ ${this.constructor.name} ][ START ]`, () => (this.pending = true));
  }

  protected stop(): void {
    runInAction(`[ ${this.constructor.name} ][ STOP ]`, () => (this.pending = false));
  }

  protected showValidation(): void {
    runInAction(
      `[ ${this.constructor.name} ][ SHOW_VALIDATION ]`,
      () => (this.showValidateResult = true),
    );
  }

  protected hideValidation(): void {
    runInAction(
      `[ ${this.constructor.name} ][ HIDE_VALIDATION ]`,
      () => (this.showValidateResult = false),
    );
  }

  protected async openForm(id?: string, ...args: any[]): Promise<ENTITY> {
    console.log(`[ ${this.constructor.name} ][ OPEN_FORM ]`, { id });

    return new this.Entity();
  }

  protected async changeForm(form: ENTITY, change: CHANGE, ...args: any[]): Promise<ENTITY> {
    console.log(`[ ${this.constructor.name} ][ CHANGE_FORM ]`, { change, form });

    return new this.Entity({ ...form.toObject(), ...change });
  }

  protected async submitForm(submit: ENTITY, ...args: any[]): Promise<void> {
    console.log(`[ ${this.constructor.name} ][ SUBMIT_FORM ]`, { submit });
  }
}

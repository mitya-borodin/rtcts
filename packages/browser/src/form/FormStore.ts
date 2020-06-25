import { Entity, ValidateResult } from "@rtcts/isomorphic";
import { getErrorMessage, isString } from "@rtcts/utils";
import EventEmitter from "eventemitter3";
import { action, computed, observable, runInAction } from "mobx";

export class FormStore<
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

  @observable
  public inputFiles: File[] = [];

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

  public async change(change: DATA & { inputFiles?: File[] }): Promise<void> {
    const title = `Change (${this.constructor.name}) has been`;

    try {
      this.start();

      if (!(this.form instanceof this.Entity)) {
        throw new Error(`tried change on closed form`);
      }

      if (change.inputFiles instanceof FileList) {
        const files: File[] = [];

        for (let i = 0; i < change.inputFiles.length; i++) {
          files.push(change.inputFiles[i]);
        }

        this.inputFiles = files;
      }

      const form = await this.changeForm(this.form, change);

      runInAction(`${title} succeed`, () => (this.form = form));
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

      if (!this.isValid) {
        this.showValidation();

        throw new Error(`these forms are not valid`);
      }

      this.hideValidation();

      if (!(this.form instanceof this.Entity)) {
        throw new Error(`the form is not an instance of the class ${this.Entity.name}`);
      }

      await this.submitForm(this.form);

      this.cancel();
    } catch (error) {
      console.error(`Submit (${this.constructor.name}) has been filed: ${getErrorMessage(error)}`);
    } finally {
      this.stop();
    }
  }

  public cancel(): void {
    runInAction(`Cancel (${this.constructor.name}) has been succeed`, () => {
      this.pending = false;
      this.inputFiles = [];
      this.form = undefined;

      this.removeAllListeners();

      this.hideValidation();
    });
  }

  protected start(): void {
    runInAction(`Start pending (${this.constructor.name})`, () => (this.pending = true));
  }

  protected stop(): void {
    runInAction(`Stop pending (${this.constructor.name})`, () => (this.pending = false));
  }

  protected showValidation(): void {
    runInAction(
      `To show the result of validation (${this.constructor.name})`,
      () => (this.showValidateResult = true),
    );
  }

  protected hideValidation(): void {
    runInAction(
      `To hide the result of validation (${this.constructor.name})`,
      () => (this.showValidateResult = false),
    );
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  protected async openForm(id?: string, ...args: any[]): Promise<ENTITY> {
    console.log(`External handler for open action (${this.constructor.name})`, {
      id,
    });

    return new this.Entity({ id });
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  protected async changeForm(
    form: ENTITY,
    change: DATA & { inputFiles?: File[] },
    ...args: any[]
  ): Promise<ENTITY> {
    console.log(`External handler for change action (${this.constructor.name})`, { change, form });

    return new this.Entity({ ...form.toObject(), ...change });
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  protected async submitForm(submit: ENTITY, ...args: any[]): Promise<ENTITY | void> {
    console.log(`External handler for submit action (${this.constructor.name})`, { submit });
  }
}

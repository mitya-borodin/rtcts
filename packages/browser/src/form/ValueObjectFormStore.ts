import { ValidationResult, ValueObject } from "@rtcts/isomorphic";
import { getErrorMessage } from "@rtcts/utils";
import EventEmitter from "eventemitter3";
import { action, computed, observable, runInAction } from "mobx";

export class ValueObjectFormStore<VALUE_OBJECT extends ValueObject, DATA> extends EventEmitter {
  @observable
  public pending: boolean;

  @observable
  public showValidateResult: boolean;

  @observable
  public form: VALUE_OBJECT | undefined;

  @observable
  public inputFiles: File[] = [];

  protected readonly Entity: new (data: any) => VALUE_OBJECT;

  constructor(Entity: new (data: any) => VALUE_OBJECT) {
    super();

    this.Entity = Entity;

    this.pending = false;
    this.showValidateResult = false;

    this.open = this.open.bind(this);
    this.change = this.change.bind(this);
    this.cancel = this.cancel.bind(this);
    this.submit = this.submit.bind(this);
  }

  @computed({ name: "ValueObjectFormStore.validationResult" })
  get validationResult(): ValidationResult {
    if (this.form instanceof this.Entity) {
      return this.form.validation();
    }

    return new ValidationResult([]);
  }

  @computed({ name: "ValueObjectFormStore.isValid" })
  get isValid(): boolean {
    return this.validationResult.isValid;
  }

  @computed({ name: "ValueObjectFormStore.isOpen" })
  get isOpen(): boolean {
    return this.form instanceof this.Entity;
  }

  public async open(): Promise<void> {
    runInAction(
      `Open (${this.constructor.name}) has been open succeed`,
      () => (this.form = new this.Entity({})),
    );
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

  @action("ValueObjectFormStore.submit")
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

  protected async changeForm(
    form: VALUE_OBJECT,
    change: DATA & { inputFiles?: File[] },
    ...args: any[]
  ): Promise<VALUE_OBJECT> {
    console.log(`External handler for change action (${this.constructor.name})`, { change, form });

    return new this.Entity({ ...form.toObject(), ...change });
  }

  protected async submitForm(submit: VALUE_OBJECT, ...args: any[]): Promise<VALUE_OBJECT | void> {
    console.log(`External handler for submit action (${this.constructor.name})`, { submit });
  }
}

import { IForm, IValidateResult } from "@borodindmitriy/interfaces";
import { ValidateResult } from "@borodindmitriy/isomorphic";
import { getErrorMessage, isString } from "@borodindmitriy/utils";
import { action, computed, observable, runInAction } from "mobx";
import { IFormStore } from "../../interfaces/form/IFormStore";

export class FormStore<FORM extends IForm, CHANGE> implements IFormStore<FORM, CHANGE> {
  @observable
  public pending: boolean = false;
  @observable
  public form: FORM | void;
  @observable
  public showValidationResult: boolean = false;

  protected readonly Form: new (...args: any[]) => FORM;

  constructor(Form: new (...args: any[]) => FORM) {
    // * DEPS
    this.Form = Form;

    // * BINDS
    this.open = this.open.bind(this);
    this.change = this.change.bind(this);
    this.submit = this.submit.bind(this);
    this.cancel = this.cancel.bind(this);
  }

  @computed({ name: "[ FORM_STORE ][ VALIDATE ]" })
  get validate(): IValidateResult {
    if (this.form instanceof this.Form) {
      return this.form.validate();
    }

    return new ValidateResult([]);
  }

  @computed({ name: "[ FORM_STORE ][ IS_VALID ]" })
  get isValid(): boolean {
    return this.validate.isValid;
  }

  @computed({ name: "[ FORM_STORE ][ IS_OPEN ]" })
  get isOpen(): boolean {
    return this.form instanceof this.Form;
  }

  @computed({ name: "[ FORM_STORE ][ IS_OPEN ]" })
  get isEdit(): boolean {
    return this.form instanceof this.Form && isString(this.form.id) && this.form.id.length > 0;
  }

  public async open(id?: string): Promise<void> {
    const hasID = isString(id) && id.length > 0;
    const message = `[ ${this.constructor.name} ][ OPEN ][ ${hasID ? "UPDATE" : "CREATE"} ]`;

    try {
      this.start();
      const form = await this.openForm(id);

      runInAction(message, () => (this.form = form));
    } catch (error) {
      console.error(`${message}[ ${getErrorMessage(error)} ]`);

      return Promise.reject();
    } finally {
      this.stop();
    }
  }

  public async change(change: CHANGE): Promise<void> {
    try {
      this.start();

      if (this.form instanceof this.Form) {
        const form = await this.changeForm(this.form, change);

        runInAction(`[ ${this.constructor.name} ][ CHANGE ]`, () => (this.form = form));
      } else {
        throw new Error(`Try change on closed form`);
      }
    } catch (error) {
      console.error(`[ ${this.constructor.name} ][ CHANGE ][ ${getErrorMessage(error)} ]`);

      return Promise.reject();
    } finally {
      this.stop();
    }
  }

  @action("[ FORM_STORE ][ SUBMIT ]")
  public async submit(): Promise<void> {
    try {
      this.start();

      if (this.isValid) {
        this.showValidationResult = false;

        if (this.form instanceof this.Form) {
          await this.submitForm(this.form);
        } else {
          throw new Error(`FORM_IS_NOT_INSTANCE_OF ${this.Form.name}`);
        }
      } else {
        this.showValidationResult = true;

        throw new Error(`IS_NOT_VALID`);
      }
    } catch (error) {
      console.error(`[ ${this.constructor.name} ][ SUBMIT ][ ${getErrorMessage(error)} ]`);

      return Promise.reject();
    } finally {
      this.stop();
    }
  }

  public cancel(): void {
    runInAction(`[ ${this.constructor.name} ][ CANCEL ]`, () => {
      this.pending = false;
      this.form = undefined;
      this.showValidationResult = false;
    });
  }

  protected start() {
    runInAction(`[ ${this.constructor.name} ][ START ]`, () => (this.pending = true));
  }

  protected stop() {
    runInAction(`[ ${this.constructor.name} ][ STOP ]`, () => (this.pending = false));
  }

  protected async openForm(id?: string): Promise<FORM> {
    console.log({ id });

    return new this.Form();
  }

  protected async changeForm(form: FORM, change: CHANGE): Promise<FORM> {
    console.log({ change, form });

    return form;
  }

  protected async submitForm(submit: FORM): Promise<void> {
    console.log({ submit });
  }
}

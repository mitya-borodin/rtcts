import { IForm, IValidateResult } from "@borodindmitriy/interfaces";
import { EventEmitter, ValidateResult } from "@borodindmitriy/isomorphic";
import { getErrorMessage, isString } from "@borodindmitriy/utils";
import { action, computed, observable, runInAction } from "mobx";
import { IFormStore } from "../../interfaces/form/IFormStore";

export class FormStore<FORM extends IForm, CHANGE> extends EventEmitter implements IFormStore<FORM, CHANGE> {
  @observable
  public pending: boolean;
  @observable
  public form: FORM | void;
  @observable
  public showValidationResult: boolean;

  protected readonly Form: new (...args: any[]) => FORM;

  constructor(Form: new (...args: any[]) => FORM) {
    super();

    // * DEPS
    this.Form = Form;

    // * INIT

    runInAction(`[ ${this.constructor.name} ][ INIT ]`, () => {
      this.pending = false;
      this.showValidationResult = false;
    });

    // * BINDS
    this.open = this.open.bind(this);
    this.change = this.change.bind(this);
    this.submit = this.submit.bind(this);
    this.cancel = this.cancel.bind(this);
  }

  @computed({ name: "[ FORM_STORE ][ VALIDATE ]" })
  get validate(): IValidateResult {
    if (this.form instanceof this.Form) {
      return this.form.getValidateResult();
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

  @computed({ name: "[ FORM_STORE ][ IS_EDIT ]" })
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
        this.hideValidation();

        if (this.form instanceof this.Form) {
          await this.submitForm(this.form);

          this.cancel();
        } else {
          throw new Error(`FORM_IS_NOT_INSTANCE_OF ${this.Form.name}`);
        }
      } else {
        this.showValidation();

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
      this.hideValidation();
    });
  }

  protected start() {
    runInAction(`[ ${this.constructor.name} ][ START ]`, () => (this.pending = true));
  }

  protected stop() {
    runInAction(`[ ${this.constructor.name} ][ STOP ]`, () => (this.pending = false));
  }

  protected showValidation() {
    runInAction(`[ ${this.constructor.name} ][ SHOW_VALIDAION ]`, () => (this.showValidationResult = true));
  }

  protected hideValidation() {
    runInAction(`[ ${this.constructor.name} ][ HILE_VALIDATION ]`, () => (this.showValidationResult = false));
  }

  protected async openForm(id?: string, ...args: any[]): Promise<FORM> {
    console.log("[ FORM_STORE ][ OPEN_FORM ]", { id });

    return new this.Form();
  }

  protected async changeForm(form: FORM, change: CHANGE, ...args: any[]): Promise<FORM> {
    console.log("[ FORM_STORE ][ CHANGE_FORM ]", { change, form });

    return new this.Form({ ...form.toJS(), ...change });
  }

  protected async submitForm(submit: FORM, ...args: any[]): Promise<void> {
    console.log("[ FORM_STORE ][ SUBMIT_FORM ]", { submit });
  }
}

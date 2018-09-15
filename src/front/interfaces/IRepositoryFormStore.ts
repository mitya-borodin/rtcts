import { IForm } from "../../interfaces/IForm";
import { IFormStore } from "./IFormStore";

/**
 * IRepositoryFormStore - для данных которые имеют сущности в системе. Имеет базовую реализацию RepositoryFormStore.
 *
 * Если форма имеет нестандартную логи, то необходимо создать подкласс от RepositoryFormStore. Таким образом получается,
 * что на каждую группу нестандартных форм появляется подкласс от RepositoryFormStore и так далее.
 *
 * Пример:
 * 1) Реадктирование характеристик товара в интеренет магазине, так как товар это сущность в системе.
 * 2) Если вы имеете список аэропортов и вам нужно отредактировать один элемент, так как каждый аэропорт это
 * сущность в системе.
 * Для редактирования товара применяются классы этого товара, а не произвольные поля, в такой ситуации код обработчика
 * формы используется !!! повторно !!!.
 *
 * Анти пример:
 * 1) Ввод логина и пароля
 * 2) Ввод данных по кредитной карте, при единоразовой оплате.
 *
 * Поля логин и пароль сами по себе не имею сущности в системе.
 * Данные по крелитной карте сами по себе не имеют сущностей в системе, если только мы не хранить карты.
 * Если мы храним данные карты как сущность в системе то это становится анти примером.
 * !!! Такая форма реализуется с нуля, так как для этих данных нет сущностей в системе. !!!
 *
 * Заключение:
 * 1) Для форм у которых нет сущностей в системе необходимо реализовать конкретные классы на каждую форму.
 * 2) Для форм у которых есть сущности в системе необходимо реализовать общий класс и при инстанцировании
 * наполнять его необходимыми классами сущностей.
 */

export interface IRepositoryFormStore<F extends IForm, C> extends IFormStore<F, C> {
  id: string | void;
  isNew: boolean;
  isEdit: boolean;

  setIsValid(isValid: boolean): void;
}
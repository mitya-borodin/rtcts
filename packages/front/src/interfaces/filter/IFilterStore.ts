export interface IFilterStore<STATE, SOURCE, VISIBLE> {
  // ! Видимость фильтров в UI.
  visible: VISIBLE;

  // ! Данные фильтров.
  source: SOURCE;

  // ! Состояние фильтров.
  state: STATE;

  // ! Обновление видимости фильтров в UI.
  setVisible<K extends keyof VISIBLE>(key: K, value: VISIBLE[K]): void;

  // ! Обновление данных фильтров.
  setSource<K extends keyof SOURCE>(key: K, value: SOURCE[K]): void;

  // ! Обновление состояния фильтров.
  setState<K extends keyof STATE>(key: K, value: STATE[K]): void;
}

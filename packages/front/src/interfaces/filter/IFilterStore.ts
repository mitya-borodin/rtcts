export interface IFilterStore<STATE, SOURCE, VISIBLE> {
  // ! Состояние фильтров.
  state: STATE;

  // ! Данные фильтров.
  source: SOURCE;

  // ! Видимость фильтров в UI.
  visible: VISIBLE;

  // ! Обновление состояния фильтров.
  setState<K extends keyof STATE>(key: K, value: STATE[K]): void;

  // ! Обновление данных фильтров.
  setSource<K extends keyof SOURCE>(key: K, value: SOURCE[K]): void;

  // ! Обновление видимости фильтров в UI.
  setVisible<K extends keyof VISIBLE>(key: K, value: VISIBLE[K]): void;
}

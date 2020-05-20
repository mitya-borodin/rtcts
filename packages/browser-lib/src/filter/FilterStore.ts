export interface FilterStore<STATE, SOURCE, VISIBLE> {
  state: STATE;
  source: SOURCE;
  visible: VISIBLE;

  setState<K extends keyof STATE>(key: K, value: STATE[K]): void;
  setSource<K extends keyof SOURCE>(key: K, value: SOURCE[K]): void;
  setVisible<K extends keyof VISIBLE>(key: K, value: VISIBLE[K]): void;
}

export interface ICacheRepository<PERSIST, FORM, CACHE, FILTER, FILTER_TYPES extends string> {
  map: Map<string, CACHE>;
  list: CACHE[];
  filter: FILTER;

  init(item: PERSIST[]): Promise<void>;

  create(item: PERSIST | FORM): Promise<CACHE>;

  update(item: PERSIST | FORM): Promise<CACHE>;

  remove(id: string): Promise<void>;

  calc(item: PERSIST | FORM): Promise<CACHE>;

  setFilter(type: FILTER_TYPES, state: boolean): void;
}

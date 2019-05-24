export interface ICalculationService<ENTITY, RESULT> {
  toСalculate(entity: ENTITY): Promise<RESULT>;
}

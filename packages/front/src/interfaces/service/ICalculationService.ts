export interface ICalculationService<ENTITY, RESULT> {
  calculation(entity: ENTITY, result?: RESULT): Promise<RESULT>;
}

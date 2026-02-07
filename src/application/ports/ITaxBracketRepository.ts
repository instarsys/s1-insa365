export interface TaxBracketDto {
  id: string;
  year: number;
  minIncome: number;
  maxIncome: number;
  dependents: number;
  taxAmount: number;
}

export interface CreateTaxBracketData {
  year: number;
  minIncome: number;
  maxIncome: number;
  dependents: number;
  taxAmount: number;
}

export interface ITaxBracketRepository {
  findByIncomeAndDependents(year: number, income: number, dependents: number): Promise<TaxBracketDto | null>;
  findAllByYear(year: number): Promise<TaxBracketDto[]>;
  createMany(data: CreateTaxBracketData[]): Promise<number>;
  deleteByYear(year: number): Promise<void>;
}

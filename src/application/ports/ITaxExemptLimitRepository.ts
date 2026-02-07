export interface TaxExemptLimitDto {
  id: string;
  year: number;
  code: string;
  name: string;
  monthlyLimit: number;
  description: string | null;
}

export interface CreateTaxExemptLimitData {
  year: number;
  code: string;
  name: string;
  monthlyLimit: number;
  description?: string;
}

export interface ITaxExemptLimitRepository {
  findByYear(year: number): Promise<TaxExemptLimitDto[]>;
  findByYearAndCode(year: number, code: string): Promise<TaxExemptLimitDto | null>;
  create(data: CreateTaxExemptLimitData): Promise<TaxExemptLimitDto>;
  update(id: string, data: Partial<CreateTaxExemptLimitData>): Promise<TaxExemptLimitDto>;
  delete(id: string): Promise<void>;
}

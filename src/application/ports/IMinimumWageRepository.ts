export interface MinimumWageDto {
  id: string;
  year: number;
  hourlyWage: number;
  monthlyWage: number;
  description: string | null;
}

export interface CreateMinimumWageData {
  year: number;
  hourlyWage: number;
  monthlyWage: number;
  description?: string;
}

export interface IMinimumWageRepository {
  findByYear(year: number): Promise<MinimumWageDto | null>;
  findAll(): Promise<MinimumWageDto[]>;
  create(data: CreateMinimumWageData): Promise<MinimumWageDto>;
  update(id: string, data: Partial<CreateMinimumWageData>): Promise<MinimumWageDto>;
  delete(id: string): Promise<void>;
}

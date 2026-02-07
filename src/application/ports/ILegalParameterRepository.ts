export interface LegalParameterDto {
  id: string;
  category: string;
  key: string;
  value: string;
  description: string | null;
  unit: string | null;
}

export interface CreateLegalParameterData {
  category: string;
  key: string;
  value: string;
  description?: string;
  unit?: string;
}

export interface ILegalParameterRepository {
  findByKey(key: string): Promise<LegalParameterDto | null>;
  findByCategory(category: string): Promise<LegalParameterDto[]>;
  findAll(): Promise<LegalParameterDto[]>;
  create(data: CreateLegalParameterData): Promise<LegalParameterDto>;
  update(id: string, data: Partial<CreateLegalParameterData>): Promise<LegalParameterDto>;
  delete(id: string): Promise<void>;
}

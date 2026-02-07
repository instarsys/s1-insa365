import type { ITaxBracketRepository, TaxBracketDto, CreateTaxBracketData } from '../../ports/ITaxBracketRepository';

export class CrudTaxBracketUseCase {
  constructor(private taxBracketRepo: ITaxBracketRepository) {}

  async listByYear(year: number): Promise<TaxBracketDto[]> {
    return this.taxBracketRepo.findAllByYear(year);
  }

  async replaceYear(year: number, data: CreateTaxBracketData[]): Promise<number> {
    await this.taxBracketRepo.deleteByYear(year);
    return this.taxBracketRepo.createMany(data);
  }
}

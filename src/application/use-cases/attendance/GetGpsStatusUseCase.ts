import type { IWorkLocationRepository } from '../../ports/IWorkLocationRepository';
import type { ICompanyRepository } from '../../ports/ICompanyRepository';
import type { GpsValidationResultDto } from '../../dtos/attendance';
import { GpsValidator, type GpsCoordinates, type GpsEnforcementMode, type WorkLocationInfo } from '@domain/services/GpsValidator';

interface EmployeeRepo {
  findById(companyId: string, userId: string): Promise<{
    workLocationId?: string | null;
  } | null>;
}

export class GetGpsStatusUseCase {
  constructor(
    private employeeRepo: EmployeeRepo,
    private workLocationRepo: IWorkLocationRepository,
    private companyRepo: ICompanyRepository,
  ) {}

  async execute(
    companyId: string,
    userId: string,
    coords?: GpsCoordinates,
  ): Promise<GpsValidationResultDto> {
    const company = await this.companyRepo.findById(companyId);
    const enforcement = (company?.gpsEnforcementMode ?? 'OFF') as GpsEnforcementMode;

    let locations: WorkLocationInfo[] = [];

    const user = await this.employeeRepo.findById(companyId, userId);
    if (user?.workLocationId) {
      const loc = await this.workLocationRepo.findById(companyId, user.workLocationId);
      if (loc && loc.latitude != null && loc.longitude != null) {
        locations = [{
          id: loc.id,
          name: loc.name,
          latitude: Number(loc.latitude),
          longitude: Number(loc.longitude),
          radiusMeters: loc.radiusMeters,
        }];
      }
    } else {
      const allActive = await this.workLocationRepo.findAllActive(companyId);
      locations = allActive
        .filter((l) => l.latitude != null && l.longitude != null)
        .map((l) => ({
          id: l.id,
          name: l.name,
          latitude: Number(l.latitude!),
          longitude: Number(l.longitude!),
          radiusMeters: l.radiusMeters,
        }));
    }

    const result = GpsValidator.validate(coords ?? null, locations, enforcement);

    return {
      isWithinRange: result.isWithinRange,
      nearestLocation: result.nearestLocation,
      enforcement: result.enforcement,
      allowed: result.allowed,
      warningMessage: result.warningMessage,
    };
  }
}

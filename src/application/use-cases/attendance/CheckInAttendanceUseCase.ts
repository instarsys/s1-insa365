import type { IAttendanceRepository } from '../../ports/IAttendanceRepository';
import type { IWorkLocationRepository } from '../../ports/IWorkLocationRepository';
import type { ICompanyRepository } from '../../ports/ICompanyRepository';
import type { CheckInResultDto } from '../../dtos/attendance';
import { GpsValidator, type GpsCoordinates, type GpsEnforcementMode, type WorkLocationInfo } from '@domain/services/GpsValidator';
import { isWorkDay, timeStringToDate } from '@domain/services/AttendanceClassifier';

interface EmployeeRepo {
  findById(companyId: string, userId: string): Promise<{
    workPolicyId?: string | null;
    workLocationId?: string | null;
    attendanceExempt?: boolean;
  } | null>;
}

interface WorkPolicyRepo {
  findById(companyId: string, id: string): Promise<{
    startTime: string;
    workDays: string;
    lateGraceMinutes: number;
  } | null>;
  findDefault(companyId: string): Promise<{
    startTime: string;
    workDays: string;
    lateGraceMinutes: number;
  } | null>;
}

export class CheckInAttendanceUseCase {
  constructor(
    private attendanceRepo: IAttendanceRepository,
    private employeeRepo: EmployeeRepo,
    private workPolicyRepo: WorkPolicyRepo,
    private workLocationRepo: IWorkLocationRepository,
    private companyRepo: ICompanyRepository,
  ) {}

  async execute(
    companyId: string,
    userId: string,
    coords?: GpsCoordinates,
  ): Promise<CheckInResultDto> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. 중복 출근 검사
    const existing = await this.attendanceRepo.findByDate(companyId, userId, today);
    if (existing?.checkInTime) {
      throw new Error('이미 출근 기록이 있습니다.');
    }

    const now = new Date();

    // 2. 직원 정보 + WorkPolicy
    const user = await this.employeeRepo.findById(companyId, userId);

    // 근태 면제 직원은 출퇴근 불필요
    if (user?.attendanceExempt) {
      throw new Error('근태 면제 대상 직원은 출퇴근 기록이 불필요합니다.');
    }
    let workPolicy = user?.workPolicyId
      ? await this.workPolicyRepo.findById(companyId, user.workPolicyId)
      : null;
    if (!workPolicy) {
      workPolicy = await this.workPolicyRepo.findDefault(companyId);
    }

    // 3. GPS 검증
    const company = await this.companyRepo.findById(companyId);
    const enforcement = (company?.gpsEnforcementMode ?? 'OFF') as GpsEnforcementMode;

    let locations: WorkLocationInfo[] = [];
    if (enforcement !== 'OFF') {
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
    }

    const gpsValidation = GpsValidator.validate(coords ?? null, locations, enforcement);

    if (!gpsValidation.allowed) {
      return {
        attendance: existing as never,
        gpsValidation,
      };
    }

    // 4. 지각 판정
    let status: 'ON_TIME' | 'LATE' = 'ON_TIME';
    if (workPolicy) {
      const lateGrace = workPolicy.lateGraceMinutes ?? 0;
      const policyStart = timeStringToDate(today, workPolicy.startTime);
      const lateThreshold = new Date(policyStart.getTime() + lateGrace * 60000);
      if (now > lateThreshold) {
        status = 'LATE';
      }
    }

    // 5. 자동 휴일 판정
    const isHoliday = workPolicy ? !isWorkDay(today, workPolicy.workDays) : false;

    // GPS 관련 데이터
    const gpsData = {
      checkInLatitude: coords?.latitude,
      checkInLongitude: coords?.longitude,
      isOutOfRange: !gpsValidation.isWithinRange,
      checkInLocationName: gpsValidation.nearestLocation?.name,
      checkInDistance: gpsValidation.nearestLocation?.distance,
    };

    // 6. Attendance 생성/업데이트
    const attendance = existing
      ? await this.attendanceRepo.update(existing.id, {
          checkInTime: now,
          ...gpsData,
          status,
        })
      : await this.attendanceRepo.create({
          companyId,
          userId,
          date: today,
          checkInTime: now,
          ...gpsData,
          status: status as string,
          isHoliday,
        } as never);

    return {
      attendance: attendance!,
      gpsValidation,
    };
  }
}

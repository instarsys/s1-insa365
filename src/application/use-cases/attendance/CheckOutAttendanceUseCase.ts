import type { IAttendanceRepository } from '../../ports/IAttendanceRepository';
import type { IWorkLocationRepository } from '../../ports/IWorkLocationRepository';
import type { ICompanyRepository } from '../../ports/ICompanyRepository';
import type { CheckOutResultDto } from '../../dtos/attendance';
import { GpsValidator, type GpsCoordinates, type GpsEnforcementMode, type WorkLocationInfo } from '@domain/services/GpsValidator';
import { AttendanceClassifier, isWorkDay } from '@domain/services/AttendanceClassifier';

interface EmployeeRepo {
  findById(companyId: string, userId: string): Promise<{
    workPolicyId?: string | null;
    workLocationId?: string | null;
  } | null>;
}

interface WorkPolicyRepo {
  findById(companyId: string, id: string): Promise<{
    startTime: string;
    endTime: string;
    breakMinutes: number;
    workDays: string;
    lateGraceMinutes: number;
    earlyLeaveGraceMinutes: number;
    nightWorkStartTime: string;
    nightWorkEndTime: string;
    overtimeThresholdMinutes: number;
  } | null>;
  findDefault(companyId: string): Promise<{
    startTime: string;
    endTime: string;
    breakMinutes: number;
    workDays: string;
    lateGraceMinutes: number;
    earlyLeaveGraceMinutes: number;
    nightWorkStartTime: string;
    nightWorkEndTime: string;
    overtimeThresholdMinutes: number;
  } | null>;
}

interface AttendanceRepoWithSegments extends IAttendanceRepository {
  replaceSegments(companyId: string, attendanceId: string, segments: { type: string; startTime: Date; endTime: Date; minutes: number }[]): Promise<void>;
}

export class CheckOutAttendanceUseCase {
  constructor(
    private attendanceRepo: AttendanceRepoWithSegments,
    private employeeRepo: EmployeeRepo,
    private workPolicyRepo: WorkPolicyRepo,
    private workLocationRepo: IWorkLocationRepository,
    private companyRepo: ICompanyRepository,
  ) {}

  async execute(
    companyId: string,
    userId: string,
    coords?: GpsCoordinates,
  ): Promise<CheckOutResultDto> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. 출근 기록 확인
    const attendance = await this.attendanceRepo.findByDate(companyId, userId, today);
    if (!attendance) {
      throw new Error('출근 기록이 없습니다. 먼저 출근해주세요.');
    }
    if (attendance.checkOutTime) {
      throw new Error('이미 퇴근 기록이 있습니다.');
    }

    const now = new Date();

    // 2. GPS 검증
    const user = await this.employeeRepo.findById(companyId, userId);
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
        attendance: attendance as never,
        gpsValidation,
      };
    }

    // 3. WorkPolicy 조회
    let workPolicy = user?.workPolicyId
      ? await this.workPolicyRepo.findById(companyId, user.workPolicyId)
      : null;
    if (!workPolicy) {
      workPolicy = await this.workPolicyRepo.findDefault(companyId);
    }

    // GPS 관련 데이터
    const gpsData = {
      checkOutLatitude: coords?.latitude,
      checkOutLongitude: coords?.longitude,
      isOutOfRange: (attendance as unknown as Record<string, unknown>).isOutOfRange as boolean || !gpsValidation.isWithinRange,
      checkOutLocationName: gpsValidation.nearestLocation?.name,
      checkOutDistance: gpsValidation.nearestLocation?.distance,
    };

    let updateData: Record<string, unknown> = {
      checkOutTime: now,
      ...gpsData,
    };

    // 4. AttendanceClassifier로 근무시간 계산
    if (attendance.checkInTime && workPolicy) {
      const isHoliday = attendance.isHoliday || !isWorkDay(today, workPolicy.workDays);

      const result = AttendanceClassifier.classify({
        checkInTime: new Date(attendance.checkInTime),
        checkOutTime: now,
        workPolicy: {
          startTime: workPolicy.startTime,
          endTime: workPolicy.endTime,
          breakMinutes: workPolicy.breakMinutes,
          workDays: workPolicy.workDays,
          lateGraceMinutes: workPolicy.lateGraceMinutes,
          earlyLeaveGraceMinutes: workPolicy.earlyLeaveGraceMinutes,
          nightWorkStartTime: workPolicy.nightWorkStartTime,
          nightWorkEndTime: workPolicy.nightWorkEndTime,
          overtimeThresholdMinutes: workPolicy.overtimeThresholdMinutes,
        },
        isHoliday,
        date: today,
      });

      const status = attendance.status === 'LATE' ? 'LATE' : result.status;

      updateData = {
        ...updateData,
        status,
        regularMinutes: result.regularMinutes,
        overtimeMinutes: result.overtimeMinutes,
        nightMinutes: result.nightMinutes,
        nightOvertimeMinutes: result.nightOvertimeMinutes,
        holidayMinutes: result.holidayMinutes,
        holidayOvertimeMinutes: result.holidayOvertimeMinutes,
        holidayNightMinutes: result.holidayNightMinutes,
        holidayNightOvertimeMinutes: result.holidayNightOvertimeMinutes,
        lateMinutes: result.lateMinutes,
        earlyLeaveMinutes: result.earlyLeaveMinutes,
        totalMinutes: result.totalMinutes,
        isHoliday,
      };

      if (result.segments.length > 0) {
        await this.attendanceRepo.replaceSegments(
          companyId,
          attendance.id,
          result.segments,
        );
      }
    } else {
      const totalMinutes = attendance.checkInTime
        ? Math.floor((now.getTime() - new Date(attendance.checkInTime).getTime()) / 60000)
        : 0;
      updateData.totalMinutes = totalMinutes;
    }

    const updated = await this.attendanceRepo.update(attendance.id, updateData as never);

    return {
      attendance: updated!,
      gpsValidation,
    };
  }
}

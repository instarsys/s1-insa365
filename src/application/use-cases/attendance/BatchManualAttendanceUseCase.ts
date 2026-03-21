import { ValidationError } from '@domain/errors';
import { AttendanceClassifier, isWorkDay } from '@/domain/services/AttendanceClassifier';
import type { BatchManualAttendanceDto, BatchManualAttendanceResultDto } from '../../dtos/attendance';

interface AttendanceRepo {
  findExistingByDateRange(companyId: string, userId: string, startDate: Date, endDate: Date): Promise<Array<{ date: Date; isConfirmed?: boolean }>>;
  createManyWithSegments(companyId: string, entries: Array<{ data: Record<string, unknown>; segments: Array<{ startTime: Date; endTime: Date; type: string; minutes: number }> }>): Promise<unknown[]>;
  findByDate(companyId: string, userId: string, date: Date): Promise<{ id: string; isConfirmed: boolean } | null>;
  update(companyId: string, id: string, data: Record<string, unknown>): Promise<unknown>;
  replaceSegments(companyId: string, attendanceId: string, segments: Array<{ startTime: Date; endTime: Date; type: string; minutes: number }>): Promise<void>;
}

interface LeaveRequestRepo {
  findApprovedByPeriod(companyId: string, userId: string, startDate: Date, endDate: Date): Promise<Array<{ startDate: Date; endDate: Date }>>;
}

interface CompanyHolidayRepo {
  findByPeriod(companyId: string, startDate: Date, endDate: Date): Promise<Array<{ date: Date }>>;
}

interface WorkPolicyRepo {
  findById(companyId: string, id: string): Promise<WorkPolicyData | null>;
  findDefault(companyId: string): Promise<WorkPolicyData | null>;
}

interface EmployeeRepo {
  findById(companyId: string, id: string): Promise<{ id: string; workPolicyId: string | null } | null>;
}

interface AuditLogRepo {
  create(data: Record<string, unknown>): Promise<unknown>;
}

interface WorkPolicyData {
  startTime: string;
  endTime: string;
  breakMinutes: number;
  workDays: string;
  lateGraceMinutes: number;
  earlyLeaveGraceMinutes: number;
  nightWorkStartTime: string;
  nightWorkEndTime: string;
  overtimeThresholdMinutes: number;
}

export class BatchManualAttendanceUseCase {
  constructor(
    private attendanceRepo: AttendanceRepo,
    private leaveRequestRepo: LeaveRequestRepo,
    private companyHolidayRepo: CompanyHolidayRepo,
    private workPolicyRepo: WorkPolicyRepo,
    private employeeRepo: EmployeeRepo,
    private auditLogRepo: AuditLogRepo,
  ) {}

  async execute(
    companyId: string,
    authUserId: string,
    dto: BatchManualAttendanceDto,
  ): Promise<BatchManualAttendanceResultDto> {
    const { userId, startDate: startStr, endDate: endStr, checkInTime, checkOutTime, status, note, isConfirmed, excludeWeekends, excludeHolidays } = dto;

    // 1. 기본 검증
    if (!userId || !startStr || !endStr) {
      throw new ValidationError('직원과 날짜를 지정해주세요.');
    }

    const [sy, sm, sd] = startStr.split('-').map(Number);
    const [ey, em, ed] = endStr.split('-').map(Number);
    const start = new Date(Date.UTC(sy, sm - 1, sd));
    const end = new Date(Date.UTC(ey, em - 1, ed));

    if (start > end) {
      throw new ValidationError('시작일은 종료일보다 이전이어야 합니다.');
    }

    const diffDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
    if (diffDays > 31) {
      throw new ValidationError('최대 31일까지 일괄 생성할 수 있습니다.');
    }

    // 2. 날짜 목록 확장
    const allDates: Date[] = [];
    for (let d = new Date(start); d <= end; d = new Date(d.getTime() + 86400000)) {
      allDates.push(new Date(d));
    }

    // 3. WorkPolicy 조회
    const employee = await this.employeeRepo.findById(companyId, userId);
    if (!employee) {
      throw new ValidationError('직원을 찾을 수 없습니다.');
    }

    let workPolicy = employee.workPolicyId
      ? await this.workPolicyRepo.findById(companyId, employee.workPolicyId)
      : null;
    if (!workPolicy) {
      workPolicy = await this.workPolicyRepo.findDefault(companyId);
    }

    // 4. 공휴일 조회
    const holidays = excludeHolidays
      ? await this.companyHolidayRepo.findByPeriod(companyId, start, end)
      : [];
    const holidaySet = new Set(holidays.map((h) => h.date.toISOString().slice(0, 10)));

    // 5. 주말/공휴일 필터링
    const filteredDates: Date[] = [];
    const skipped: { date: string; reason: string }[] = [];

    for (const d of allDates) {
      const dateStr = d.toISOString().slice(0, 10);
      const dayOfWeek = d.getUTCDay();

      if (excludeWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
        skipped.push({ date: dateStr, reason: '주말' });
        continue;
      }
      if (excludeHolidays && holidaySet.has(dateStr)) {
        skipped.push({ date: dateStr, reason: '공휴일' });
        continue;
      }
      filteredDates.push(d);
    }

    // 6. 확정 근태 / 승인 휴가 검증 (배치 조회)
    const existingAttendances = await this.attendanceRepo.findExistingByDateRange(companyId, userId, start, end);
    const confirmedDates = new Set(
      existingAttendances
        .filter((a) => a.isConfirmed)
        .map((a) => a.date.toISOString().slice(0, 10)),
    );

    const approvedLeaves = await this.leaveRequestRepo.findApprovedByPeriod(companyId, userId, start, end);
    const leaveDateSet = new Set<string>();
    for (const leave of approvedLeaves) {
      for (let d = new Date(leave.startDate); d <= leave.endDate; d = new Date(d.getTime() + 86400000)) {
        leaveDateSet.add(d.toISOString().slice(0, 10));
      }
    }

    const validDates: Date[] = [];
    for (const d of filteredDates) {
      const dateStr = d.toISOString().slice(0, 10);
      if (confirmedDates.has(dateStr)) {
        skipped.push({ date: dateStr, reason: '확정된 근태 기록이 존재합니다' });
        continue;
      }
      if (leaveDateSet.has(dateStr)) {
        skipped.push({ date: dateStr, reason: '승인된 휴가가 존재합니다' });
        continue;
      }
      validDates.push(d);
    }

    if (validDates.length === 0) {
      throw new ValidationError('생성 가능한 날짜가 없습니다. 필터 설정을 확인해주세요.');
    }

    // 7. 각 날짜별 근태 데이터 생성
    const entriesToCreate: Array<{
      data: Record<string, unknown>;
      segments: Array<{ startTime: Date; endTime: Date; type: string; minutes: number }>;
    }> = [];
    const entriesToUpdate: Array<{
      existingId: string;
      data: Record<string, unknown>;
      segments: Array<{ startTime: Date; endTime: Date; type: string; minutes: number }>;
    }> = [];

    const existingMap = new Map(
      existingAttendances.map((a) => [a.date.toISOString().slice(0, 10), a]),
    );

    for (const dateObj of validDates) {
      const dateStr = dateObj.toISOString().slice(0, 10);
      const checkInISO = checkInTime ? new Date(`${dateStr}T${checkInTime}:00`).toISOString() : undefined;
      const checkOutISO = checkOutTime ? new Date(`${dateStr}T${checkOutTime}:00`).toISOString() : undefined;

      let minutesData: Record<string, unknown> = {};
      let autoStatus: string | null = null;
      let autoIsHoliday = dto.isHoliday ?? false;
      let classifySegments: Array<{ startTime: Date; endTime: Date; type: string; minutes: number }> = [];

      if (checkInISO && checkOutISO && workPolicy) {
        if (dto.isHoliday === undefined || dto.isHoliday === null) {
          autoIsHoliday = !isWorkDay(dateObj, workPolicy.workDays);
        }

        const result = AttendanceClassifier.classify({
          checkInTime: new Date(checkInISO),
          checkOutTime: new Date(checkOutISO),
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
          isHoliday: autoIsHoliday,
          date: dateObj,
        });

        minutesData = {
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
        };
        autoStatus = result.status;
        classifySegments = result.segments;
      }

      const finalStatus = status ?? autoStatus ?? 'ON_TIME';
      const data: Record<string, unknown> = {
        checkInTime: checkInISO ? new Date(checkInISO) : null,
        checkOutTime: checkOutISO ? new Date(checkOutISO) : null,
        status: finalStatus,
        note: note ?? null,
        isHoliday: autoIsHoliday,
        ...minutesData,
        ...(isConfirmed !== undefined && { isConfirmed }),
      };

      const existing = existingMap.get(dateStr);
      if (existing && !existing.isConfirmed) {
        entriesToUpdate.push({ existingId: (existing as unknown as { id: string }).id, data, segments: classifySegments });
      } else {
        entriesToCreate.push({
          data: { userId, date: dateObj, ...data },
          segments: classifySegments,
        });
      }
    }

    // 8. 일괄 생성 (트랜잭션)
    if (entriesToCreate.length > 0) {
      await this.attendanceRepo.createManyWithSegments(companyId, entriesToCreate);
    }

    // 9. 기존 미확정 근태 업데이트
    for (const entry of entriesToUpdate) {
      await this.attendanceRepo.update(companyId, entry.existingId, entry.data);
      if (entry.segments.length > 0) {
        await this.attendanceRepo.replaceSegments(companyId, entry.existingId, entry.segments);
      }
    }

    // 10. 감사 로그
    await this.auditLogRepo.create({
      userId: authUserId,
      companyId,
      action: 'CREATE',
      entityType: 'Attendance',
      entityId: userId,
      after: {
        type: 'BATCH',
        startDate: startStr,
        endDate: endStr,
        totalCreated: entriesToCreate.length + entriesToUpdate.length,
        totalSkipped: skipped.length,
      },
    });

    const created = validDates.map((d) => ({ date: d.toISOString().slice(0, 10) }));

    return {
      totalRequested: allDates.length,
      totalCreated: created.length,
      totalSkipped: skipped.length,
      created,
      skipped,
    };
  }
}

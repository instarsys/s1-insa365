import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ValidationError } from '@/domain/errors';
import { CheckInAttendanceUseCase } from '../CheckInAttendanceUseCase';

// Mock factories
function createMockAttendanceRepo() {
  return {
    findByDate: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockImplementation((_data: Record<string, unknown>) =>
      Promise.resolve({
        id: 'att-1',
        checkInTime: new Date(),
        status: 'ON_TIME',
      }),
    ),
    update: vi.fn(),
    // IAttendanceRepository의 나머지 메서드 stub
    findById: vi.fn(),
    findAll: vi.fn(),
    findByMonth: vi.fn(),
    findByDateRange: vi.fn(),
    confirmByMonth: vi.fn(),
    cancelConfirmByMonth: vi.fn(),
    deleteAutoAbsentByMonth: vi.fn(),
    softDelete: vi.fn(),
    replaceSegments: vi.fn(),
    findExistingByDateRange: vi.fn(),
    findApprovedByPeriod: vi.fn(),
  };
}

function createMockEmployeeRepo() {
  return {
    findById: vi.fn().mockResolvedValue({
      workPolicyId: 'wp-1',
      workLocationId: null,
      attendanceExempt: false,
    }),
  };
}

function createMockWorkPolicyRepo() {
  return {
    findById: vi.fn().mockResolvedValue({
      startTime: '09:00',
      workDays: 'MON,TUE,WED,THU,FRI',
      lateGraceMinutes: 0,
      checkInAllowedMinutes: 30,
    }),
    findDefault: vi.fn().mockResolvedValue({
      startTime: '09:00',
      workDays: 'MON,TUE,WED,THU,FRI',
      lateGraceMinutes: 0,
      checkInAllowedMinutes: 30,
    }),
  };
}

function createMockWorkLocationRepo() {
  return {
    findById: vi.fn(),
    findAllActive: vi.fn().mockResolvedValue([]),
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
  };
}

function createMockCompanyRepo() {
  return {
    findById: vi.fn().mockResolvedValue({
      id: 'comp-1',
      gpsEnforcementMode: 'OFF',
    }),
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };
}

function createMockLeaveRequestRepo() {
  return {
    findApprovedByPeriod: vi.fn().mockResolvedValue([]),
  };
}

describe('CheckInAttendanceUseCase', () => {
  let useCase: CheckInAttendanceUseCase;
  let attendanceRepo: ReturnType<typeof createMockAttendanceRepo>;
  let employeeRepo: ReturnType<typeof createMockEmployeeRepo>;
  let workPolicyRepo: ReturnType<typeof createMockWorkPolicyRepo>;
  let workLocationRepo: ReturnType<typeof createMockWorkLocationRepo>;
  let companyRepo: ReturnType<typeof createMockCompanyRepo>;
  let leaveRequestRepo: ReturnType<typeof createMockLeaveRequestRepo>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-20T08:45:00+09:00'));

    attendanceRepo = createMockAttendanceRepo();
    employeeRepo = createMockEmployeeRepo();
    workPolicyRepo = createMockWorkPolicyRepo();
    workLocationRepo = createMockWorkLocationRepo();
    companyRepo = createMockCompanyRepo();
    leaveRequestRepo = createMockLeaveRequestRepo();

    useCase = new CheckInAttendanceUseCase(
      attendanceRepo as never,
      employeeRepo,
      workPolicyRepo,
      workLocationRepo as never,
      companyRepo as never,
      leaveRequestRepo,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('승인된 휴가 없으면 정상 출근 처리', async () => {
    leaveRequestRepo.findApprovedByPeriod.mockResolvedValue([]);

    const result = await useCase.execute('comp-1', 'user-1');

    expect(result.attendance).toBeDefined();
    expect(attendanceRepo.create).toHaveBeenCalled();
    expect(leaveRequestRepo.findApprovedByPeriod).toHaveBeenCalledWith(
      'comp-1',
      'user-1',
      expect.any(Date),
      expect.any(Date),
    );
  });

  it('승인된 휴가가 있으면 출근 차단 (Error throw)', async () => {
    leaveRequestRepo.findApprovedByPeriod.mockResolvedValue([
      { startDate: new Date('2026-06-01'), endDate: new Date('2026-06-01') },
    ]);

    await expect(useCase.execute('comp-1', 'user-1')).rejects.toThrow(
      '해당 날짜에 승인된 휴가가 있어 출근 기록을 생성할 수 없습니다',
    );

    expect(attendanceRepo.create).not.toHaveBeenCalled();
  });

  it('PENDING 휴가는 차단하지 않음 (정상 출근)', async () => {
    // findApprovedByPeriod는 APPROVED만 반환하므로 PENDING 휴가는 빈 배열
    leaveRequestRepo.findApprovedByPeriod.mockResolvedValue([]);

    const result = await useCase.execute('comp-1', 'user-1');

    expect(result.attendance).toBeDefined();
    expect(attendanceRepo.create).toHaveBeenCalled();
  });

  it('허용시간 이전 출근은 ValidationError를 던진다', async () => {
    vi.setSystemTime(new Date('2026-04-20T08:20:00+09:00'));

    await expect(useCase.execute('comp-1', 'user-1')).rejects.toThrow(ValidationError);
    await expect(useCase.execute('comp-1', 'user-1')).rejects.toThrow(
      '출근은 09:00 기준 30분 전부터 가능합니다.',
    );
  });
});

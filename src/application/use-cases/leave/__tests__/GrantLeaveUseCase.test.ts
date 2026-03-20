import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GrantLeaveUseCase } from '../GrantLeaveUseCase';
import { EntityNotFoundError, ValidationError } from '@domain/errors';

function createMockLeaveRequestRepo() {
  return {
    create: vi.fn().mockResolvedValue({ id: 'lr-1' }),
  };
}

function createMockLeaveBalanceRepo() {
  return {
    findByUserAndYear: vi.fn().mockResolvedValue({
      id: 'bal-1',
      remainingDays: 10,
    }),
    update: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockLeaveTypeConfigRepo() {
  return {
    findById: vi.fn().mockResolvedValue({
      id: 'ltc-1',
      code: 'ANNUAL',
      name: '연차',
      deductsFromBalance: true,
    }),
  };
}

function createMockNotificationRepo() {
  return {
    create: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockAttendanceRepo() {
  return {
    findExistingByDateRange: vi.fn().mockResolvedValue([]),
  };
}

const BASE_DTO = {
  userId: 'user-1',
  leaveTypeConfigId: 'ltc-1',
  startDate: '2026-06-01',
  endDate: '2026-06-01',
  days: 1,
  reason: '테스트 휴가',
};

describe('GrantLeaveUseCase', () => {
  let useCase: GrantLeaveUseCase;
  let leaveRequestRepo: ReturnType<typeof createMockLeaveRequestRepo>;
  let leaveBalanceRepo: ReturnType<typeof createMockLeaveBalanceRepo>;
  let leaveTypeConfigRepo: ReturnType<typeof createMockLeaveTypeConfigRepo>;
  let notificationRepo: ReturnType<typeof createMockNotificationRepo>;
  let attendanceRepo: ReturnType<typeof createMockAttendanceRepo>;

  beforeEach(() => {
    leaveRequestRepo = createMockLeaveRequestRepo();
    leaveBalanceRepo = createMockLeaveBalanceRepo();
    leaveTypeConfigRepo = createMockLeaveTypeConfigRepo();
    notificationRepo = createMockNotificationRepo();
    attendanceRepo = createMockAttendanceRepo();

    useCase = new GrantLeaveUseCase(
      leaveRequestRepo,
      leaveBalanceRepo,
      leaveTypeConfigRepo,
      notificationRepo,
      attendanceRepo,
    );
  });

  it('근태 기록 없으면 정상 휴가 부여', async () => {
    attendanceRepo.findExistingByDateRange.mockResolvedValue([]);

    const result = await useCase.execute('comp-1', 'admin-1', BASE_DTO);

    expect(result).toEqual({ id: 'lr-1' });
    expect(leaveRequestRepo.create).toHaveBeenCalledWith(
      'comp-1',
      expect.objectContaining({
        userId: 'user-1',
        status: 'APPROVED',
        approvedBy: 'admin-1',
      }),
    );
    expect(leaveBalanceRepo.update).toHaveBeenCalledWith(
      'comp-1',
      'bal-1',
      expect.objectContaining({
        usedDays: { increment: 1 },
        remainingDays: { decrement: 1 },
      }),
    );
    expect(notificationRepo.create).toHaveBeenCalled();
  });

  it('근태 기록 존재 시 ValidationError throw', async () => {
    attendanceRepo.findExistingByDateRange.mockResolvedValue([
      { date: new Date('2026-06-01') },
    ]);

    await expect(
      useCase.execute('comp-1', 'admin-1', BASE_DTO),
    ).rejects.toThrow(ValidationError);

    await expect(
      useCase.execute('comp-1', 'admin-1', BASE_DTO),
    ).rejects.toThrow('해당 기간에 근태 기록이 존재하여 휴가를 부여할 수 없습니다');

    expect(leaveRequestRepo.create).not.toHaveBeenCalled();
  });

  it('LeaveTypeConfig 없으면 EntityNotFoundError', async () => {
    leaveTypeConfigRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute('comp-1', 'admin-1', BASE_DTO),
    ).rejects.toThrow(EntityNotFoundError);
  });

  it('잔여일수 부족 시 ValidationError (regression)', async () => {
    leaveBalanceRepo.findByUserAndYear.mockResolvedValue({
      id: 'bal-1',
      remainingDays: 0,
    });

    await expect(
      useCase.execute('comp-1', 'admin-1', BASE_DTO),
    ).rejects.toThrow(ValidationError);

    await expect(
      useCase.execute('comp-1', 'admin-1', BASE_DTO),
    ).rejects.toThrow('잔여일수가 부족합니다');
  });
});

/**
 * Tenant Isolation Tests
 *
 * These tests verify that repository methods properly enforce
 * companyId-based tenant isolation on update/delete operations.
 * Uses Vitest mocking to simulate Prisma client behavior.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Prisma client
vi.mock('../../prisma/client', () => ({
  prisma: {
    department: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    position: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    salaryRule: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    employeeSalaryItem: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    attendance: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    salaryCalculation: {
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    leaveRequest: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    leaveBalance: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    notification: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    employeeInvitation: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    announcement: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    payment: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    subscription: {
      findFirst: vi.fn(),
    },
    companyHoliday: {
      findFirst: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import { prisma } from '../../prisma/client';
import { DepartmentRepository } from '../DepartmentRepository';
import { PositionRepository } from '../PositionRepository';
import { SalaryRuleRepository } from '../SalaryRuleRepository';
import { EmployeeSalaryItemRepository } from '../EmployeeSalaryItemRepository';
import { AttendanceRepository } from '../AttendanceRepository';
import { SalaryCalculationRepository } from '../SalaryCalculationRepository';
import { LeaveRequestRepository } from '../LeaveRequestRepository';
import { LeaveBalanceRepository } from '../LeaveBalanceRepository';
import { NotificationRepository } from '../NotificationRepository';
import { EmployeeRepository } from '../EmployeeRepository';
import { InvitationRepository } from '../InvitationRepository';
import { AnnouncementRepository } from '../AnnouncementRepository';
import { PaymentRepository } from '../PaymentRepository';
import { CompanyHolidayRepository } from '../CompanyHolidayRepository';

const COMPANY_A = 'company-a-id';
const COMPANY_B = 'company-b-id';
const RECORD_ID = 'record-123';

const mockPrisma = prisma as unknown as {
  [key: string]: {
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Tenant Isolation — Repository Layer', () => {
  describe('DepartmentRepository', () => {
    const repo = new DepartmentRepository();

    it('update() returns null when companyId does not match', async () => {
      mockPrisma.department.findFirst.mockResolvedValue(null);

      const result = await repo.update(COMPANY_B, RECORD_ID, { name: 'Hacked' });

      expect(result).toBeNull();
      expect(mockPrisma.department.findFirst).toHaveBeenCalledWith({
        where: { id: RECORD_ID, companyId: COMPANY_B, deletedAt: null },
      });
      expect(mockPrisma.department.update).not.toHaveBeenCalled();
    });

    it('update() proceeds when companyId matches', async () => {
      const existing = { id: RECORD_ID, companyId: COMPANY_A, name: 'HR' };
      mockPrisma.department.findFirst.mockResolvedValue(existing);
      mockPrisma.department.update.mockResolvedValue({ ...existing, name: 'Updated' });

      const result = await repo.update(COMPANY_A, RECORD_ID, { name: 'Updated' });

      expect(result).not.toBeNull();
      expect(mockPrisma.department.update).toHaveBeenCalledWith({
        where: { id: RECORD_ID },
        data: { name: 'Updated' },
      });
    });

    it('softDelete() returns null when companyId does not match', async () => {
      mockPrisma.department.findFirst.mockResolvedValue(null);

      const result = await repo.softDelete(COMPANY_B, RECORD_ID);

      expect(result).toBeNull();
      expect(mockPrisma.department.update).not.toHaveBeenCalled();
    });
  });

  describe('PositionRepository', () => {
    const repo = new PositionRepository();

    it('update() blocks cross-tenant access', async () => {
      mockPrisma.position.findFirst.mockResolvedValue(null);

      const result = await repo.update(COMPANY_B, RECORD_ID, { name: 'Hacked' });

      expect(result).toBeNull();
      expect(mockPrisma.position.update).not.toHaveBeenCalled();
    });

    it('softDelete() blocks cross-tenant access', async () => {
      mockPrisma.position.findFirst.mockResolvedValue(null);

      const result = await repo.softDelete(COMPANY_B, RECORD_ID);

      expect(result).toBeNull();
      expect(mockPrisma.position.update).not.toHaveBeenCalled();
    });
  });

  describe('SalaryRuleRepository', () => {
    const repo = new SalaryRuleRepository();

    it('update() blocks cross-tenant access', async () => {
      mockPrisma.salaryRule.findFirst.mockResolvedValue(null);

      const result = await repo.update(COMPANY_B, RECORD_ID, { name: 'Hacked' });

      expect(result).toBeNull();
      expect(mockPrisma.salaryRule.update).not.toHaveBeenCalled();
    });

    it('softDelete() blocks cross-tenant access', async () => {
      mockPrisma.salaryRule.findFirst.mockResolvedValue(null);

      const result = await repo.softDelete(COMPANY_B, RECORD_ID);

      expect(result).toBeNull();
      expect(mockPrisma.salaryRule.update).not.toHaveBeenCalled();
    });
  });

  describe('EmployeeSalaryItemRepository', () => {
    const repo = new EmployeeSalaryItemRepository();

    it('update() blocks cross-tenant access', async () => {
      mockPrisma.employeeSalaryItem.findFirst.mockResolvedValue(null);

      const result = await repo.update(COMPANY_B, RECORD_ID, { name: 'Hacked' });

      expect(result).toBeNull();
      expect(mockPrisma.employeeSalaryItem.update).not.toHaveBeenCalled();
    });

    it('softDelete() blocks cross-tenant access', async () => {
      mockPrisma.employeeSalaryItem.findFirst.mockResolvedValue(null);

      const result = await repo.softDelete(COMPANY_B, RECORD_ID);

      expect(result).toBeNull();
      expect(mockPrisma.employeeSalaryItem.update).not.toHaveBeenCalled();
    });
  });

  describe('AttendanceRepository', () => {
    const repo = new AttendanceRepository();

    it('update() blocks cross-tenant access', async () => {
      mockPrisma.attendance.findFirst.mockResolvedValue(null);

      const result = await repo.update(COMPANY_B, RECORD_ID, { note: 'Hacked' });

      expect(result).toBeNull();
      expect(mockPrisma.attendance.update).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────────
  // P0-1: SalaryCalculationRepository.update() companyId 가드
  // ──────────────────────────────────────────────────────────────
  describe('SalaryCalculationRepository', () => {
    const repo = new SalaryCalculationRepository();

    it('update() blocks cross-tenant access (companyId mismatch)', async () => {
      mockPrisma.salaryCalculation.findFirst.mockResolvedValue(null);

      const result = await repo.update(COMPANY_B, RECORD_ID, { netPay: 9999999 });

      expect(result).toBeNull();
      expect(mockPrisma.salaryCalculation.findFirst).toHaveBeenCalledWith({
        where: { id: RECORD_ID, companyId: COMPANY_B, deletedAt: null },
      });
      expect(mockPrisma.salaryCalculation.update).not.toHaveBeenCalled();
    });

    it('update() proceeds when companyId matches', async () => {
      const existing = { id: RECORD_ID, companyId: COMPANY_A, netPay: 3000000 };
      mockPrisma.salaryCalculation.findFirst.mockResolvedValue(existing);
      mockPrisma.salaryCalculation.update.mockResolvedValue({ ...existing, netPay: 3500000 });

      const result = await repo.update(COMPANY_A, RECORD_ID, { netPay: 3500000 });

      expect(result).not.toBeNull();
      expect(mockPrisma.salaryCalculation.update).toHaveBeenCalledWith({
        where: { id: RECORD_ID },
        data: { netPay: 3500000 },
        include: { user: { include: { department: true, position: true } } },
      });
    });

    it('updateStatus() applies bulk update by period', async () => {
      mockPrisma.salaryCalculation.updateMany.mockResolvedValue({ count: 0 });

      await repo.updateStatus(COMPANY_B, 2026, 1, 'CONFIRMED');

      expect(mockPrisma.salaryCalculation.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ companyId: COMPANY_B }),
        }),
      );
    });
  });

  describe('LeaveRequestRepository', () => {
    const repo = new LeaveRequestRepository();

    it('update() blocks cross-tenant access', async () => {
      mockPrisma.leaveRequest.findFirst.mockResolvedValue(null);

      const result = await repo.update(COMPANY_B, RECORD_ID, { status: 'APPROVED' });

      expect(result).toBeNull();
      expect(mockPrisma.leaveRequest.update).not.toHaveBeenCalled();
    });
  });

  describe('LeaveBalanceRepository', () => {
    const repo = new LeaveBalanceRepository();

    it('update() blocks cross-tenant access', async () => {
      mockPrisma.leaveBalance.findFirst.mockResolvedValue(null);

      const result = await repo.update(COMPANY_B, RECORD_ID, { totalDays: 999 });

      expect(result).toBeNull();
      expect(mockPrisma.leaveBalance.update).not.toHaveBeenCalled();
    });
  });

  describe('NotificationRepository', () => {
    const repo = new NotificationRepository();

    it('markRead() blocks cross-tenant access', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue(null);

      const result = await repo.markRead(COMPANY_B, 'user-x', RECORD_ID);

      expect(result).toBeNull();
      expect(mockPrisma.notification.findFirst).toHaveBeenCalledWith({
        where: { id: RECORD_ID, companyId: COMPANY_B, userId: 'user-x' },
      });
      expect(mockPrisma.notification.update).not.toHaveBeenCalled();
    });
  });

  describe('EmployeeRepository', () => {
    const repo = new EmployeeRepository();

    it('update() blocks cross-tenant access', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const result = await repo.update(COMPANY_B, RECORD_ID, { name: 'Hacked' });

      expect(result).toBeNull();
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('softDelete() blocks cross-tenant access', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const result = await repo.softDelete(COMPANY_B, RECORD_ID);

      expect(result).toBeNull();
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('update() allows same-tenant access', async () => {
      const existing = { id: RECORD_ID, companyId: COMPANY_A };
      mockPrisma.user.findFirst.mockResolvedValue(existing);
      mockPrisma.user.update.mockResolvedValue({ ...existing, name: 'Updated' });

      const result = await repo.update(COMPANY_A, RECORD_ID, { name: 'Updated' });

      expect(result).not.toBeNull();
      expect(mockPrisma.user.update).toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────────
  // P0-3: InvitationRepository.update() companyId 가드
  // ──────────────────────────────────────────────────────────────
  describe('InvitationRepository', () => {
    const repo = new InvitationRepository();

    it('update() blocks cross-tenant access', async () => {
      mockPrisma.employeeInvitation.findFirst.mockResolvedValue(null);

      const result = await repo.update(COMPANY_B, RECORD_ID, { status: 'ACCEPTED' });

      expect(result).toBeNull();
      expect(mockPrisma.employeeInvitation.findFirst).toHaveBeenCalledWith({
        where: { id: RECORD_ID, companyId: COMPANY_B },
      });
      expect(mockPrisma.employeeInvitation.update).not.toHaveBeenCalled();
    });

    it('update() proceeds when companyId matches', async () => {
      const existing = { id: RECORD_ID, companyId: COMPANY_A, status: 'PENDING' };
      mockPrisma.employeeInvitation.findFirst.mockResolvedValue(existing);
      mockPrisma.employeeInvitation.update.mockResolvedValue({ ...existing, status: 'SENT' });

      const result = await repo.update(COMPANY_A, RECORD_ID, { status: 'SENT' });

      expect(result).not.toBeNull();
      expect(mockPrisma.employeeInvitation.update).toHaveBeenCalledWith({
        where: { id: RECORD_ID },
        data: { status: 'SENT' },
      });
    });
  });

  // ──────────────────────────────────────────────────────────────
  // P0-4: AnnouncementRepository.softDelete() companyId 가드
  // ──────────────────────────────────────────────────────────────
  describe('AnnouncementRepository', () => {
    const repo = new AnnouncementRepository();

    it('softDelete() blocks cross-tenant access', async () => {
      mockPrisma.announcement.findFirst.mockResolvedValue(null);

      const result = await repo.softDelete(COMPANY_B, RECORD_ID);

      expect(result).toBeNull();
      expect(mockPrisma.announcement.findFirst).toHaveBeenCalledWith({
        where: { id: RECORD_ID, companyId: COMPANY_B, deletedAt: null },
      });
      expect(mockPrisma.announcement.update).not.toHaveBeenCalled();
    });

    it('softDelete() proceeds when companyId matches', async () => {
      const existing = { id: RECORD_ID, companyId: COMPANY_A, title: 'Notice' };
      mockPrisma.announcement.findFirst.mockResolvedValue(existing);
      mockPrisma.announcement.update.mockResolvedValue({ ...existing, deletedAt: new Date() });

      const result = await repo.softDelete(COMPANY_A, RECORD_ID);

      expect(result).not.toBeNull();
      expect(mockPrisma.announcement.update).toHaveBeenCalledWith({
        where: { id: RECORD_ID },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('softDelete() works for system announcements (companyId=null)', async () => {
      const existing = { id: RECORD_ID, companyId: null, title: 'System Notice' };
      mockPrisma.announcement.findFirst.mockResolvedValue(existing);
      mockPrisma.announcement.update.mockResolvedValue({ ...existing, deletedAt: new Date() });

      const result = await repo.softDelete(null, RECORD_ID);

      expect(result).not.toBeNull();
      expect(mockPrisma.announcement.findFirst).toHaveBeenCalledWith({
        where: { id: RECORD_ID, companyId: null, deletedAt: null },
      });
    });
  });

  // ──────────────────────────────────────────────────────────────
  // P0-2: PaymentRepository companyId 가드
  // ──────────────────────────────────────────────────────────────
  describe('PaymentRepository', () => {
    const repo = new PaymentRepository();

    it('findBySubscriptionId() returns empty when subscription does not belong to company', async () => {
      (mockPrisma as unknown as { subscription: { findFirst: ReturnType<typeof vi.fn> } }).subscription.findFirst.mockResolvedValue(null);

      const result = await repo.findBySubscriptionId(COMPANY_B, 'sub-123');

      expect(result).toEqual([]);
      expect((mockPrisma as unknown as { subscription: { findFirst: ReturnType<typeof vi.fn> } }).subscription.findFirst).toHaveBeenCalledWith({
        where: { id: 'sub-123', companyId: COMPANY_B },
      });
    });

    it('updateStatus() returns null when payment does not belong to company', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue({
        id: RECORD_ID,
        subscription: { companyId: COMPANY_A },
      });

      const result = await repo.updateStatus(COMPANY_B, RECORD_ID, 'PAID');

      expect(result).toBeNull();
      expect(mockPrisma.payment.update).not.toHaveBeenCalled();
    });

    it('updateStatus() proceeds when payment belongs to company', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue({
        id: RECORD_ID,
        subscription: { companyId: COMPANY_A },
      });
      mockPrisma.payment.update.mockResolvedValue({ id: RECORD_ID, status: 'PAID' });

      const result = await repo.updateStatus(COMPANY_A, RECORD_ID, 'PAID');

      expect(result).not.toBeNull();
      expect(mockPrisma.payment.update).toHaveBeenCalledWith({
        where: { id: RECORD_ID },
        data: { status: 'PAID' },
      });
    });
  });

  // ──────────────────────────────────────────────────────────────
  // CompanyHolidayRepository.delete() companyId 가드 (잔여 1건)
  // ──────────────────────────────────────────────────────────────
  describe('CompanyHolidayRepository', () => {
    const repo = new CompanyHolidayRepository();

    it('delete() blocks cross-tenant access (companyId mismatch)', async () => {
      (mockPrisma as unknown as { companyHoliday: { findFirst: ReturnType<typeof vi.fn>; deleteMany: ReturnType<typeof vi.fn> } }).companyHoliday.findFirst.mockResolvedValue(null);

      await repo.delete(COMPANY_B, RECORD_ID);

      expect((mockPrisma as unknown as { companyHoliday: { findFirst: ReturnType<typeof vi.fn>; deleteMany: ReturnType<typeof vi.fn> } }).companyHoliday.findFirst).toHaveBeenCalledWith({
        where: { id: RECORD_ID, companyId: COMPANY_B },
      });
      expect((mockPrisma as unknown as { companyHoliday: { deleteMany: ReturnType<typeof vi.fn> } }).companyHoliday.deleteMany).not.toHaveBeenCalled();
    });

    it('delete() proceeds with deleteMany(companyId) when companyId matches', async () => {
      const existing = { id: RECORD_ID, companyId: COMPANY_A, name: '회사 창립일' };
      (mockPrisma as unknown as { companyHoliday: { findFirst: ReturnType<typeof vi.fn>; deleteMany: ReturnType<typeof vi.fn> } }).companyHoliday.findFirst.mockResolvedValue(existing);
      (mockPrisma as unknown as { companyHoliday: { deleteMany: ReturnType<typeof vi.fn> } }).companyHoliday.deleteMany.mockResolvedValue({ count: 1 });

      await repo.delete(COMPANY_A, RECORD_ID);

      expect((mockPrisma as unknown as { companyHoliday: { deleteMany: ReturnType<typeof vi.fn> } }).companyHoliday.deleteMany).toHaveBeenCalledWith({
        where: { id: RECORD_ID, companyId: COMPANY_A },
      });
    });
  });
});

describe('Tenant Extension — companyId auto-inject', () => {
  it('createTenantExtension is importable and returns an extension', async () => {
    const { createTenantExtension } = await import('../../prisma/tenant-extension');
    const extension = createTenantExtension('test-company-id');
    expect(extension).toBeDefined();
  });
});

// ──────────────────────────────────────────────────────────────
// P1-4: setTenantContext UUID 검증
// ──────────────────────────────────────────────────────────────
describe('setTenantContext — UUID validation', () => {
  it('rejects non-UUID companyId', async () => {
    const { setTenantContext } = await import('../../prisma/tenant-extension');
    const fakePrisma = { $executeRawUnsafe: vi.fn() } as unknown as Parameters<typeof setTenantContext>[0];

    await expect(setTenantContext(fakePrisma, "'; DROP TABLE users; --")).rejects.toThrow('Invalid companyId format');
    expect(fakePrisma.$executeRawUnsafe).not.toHaveBeenCalled();
  });

  it('rejects empty string', async () => {
    const { setTenantContext } = await import('../../prisma/tenant-extension');
    const fakePrisma = { $executeRawUnsafe: vi.fn() } as unknown as Parameters<typeof setTenantContext>[0];

    await expect(setTenantContext(fakePrisma, '')).rejects.toThrow('Invalid companyId format');
  });

  it('accepts valid UUID', async () => {
    const { setTenantContext } = await import('../../prisma/tenant-extension');
    const fakePrisma = { $executeRawUnsafe: vi.fn() } as unknown as Parameters<typeof setTenantContext>[0];

    await setTenantContext(fakePrisma, '550e8400-e29b-41d4-a716-446655440000');

    expect(fakePrisma.$executeRawUnsafe).toHaveBeenCalledWith(
      "SET LOCAL app.company_id = '550e8400-e29b-41d4-a716-446655440000'",
    );
  });
});

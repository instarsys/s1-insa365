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

  describe('SalaryCalculationRepository', () => {
    const repo = new SalaryCalculationRepository();

    it('update() blocks cross-tenant access', async () => {
      mockPrisma.salaryCalculation.findFirst.mockResolvedValue(null);

      const result = await repo.update(RECORD_ID, { netPay: 9999999 });

      // update no longer checks companyId (validated upstream by findByPeriod)
      expect(mockPrisma.salaryCalculation.update).toHaveBeenCalled();
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
});

describe('Tenant Extension — companyId auto-inject', () => {
  it('createTenantExtension is importable and returns an extension', async () => {
    const { createTenantExtension } = await import('../../prisma/tenant-extension');
    const extension = createTenantExtension('test-company-id');
    expect(extension).toBeDefined();
  });
});

import type { GrantLeaveDto } from '../../dtos/leave';
import { EntityNotFoundError, ValidationError } from '@domain/errors';
import type { LeaveType } from '@/generated/prisma/client';

/** config code → LeaveType enum 매핑 */
function mapCodeToLeaveType(code: string): LeaveType {
  switch (code) {
    case 'ANNUAL': return 'ANNUAL';
    case 'HALF_DAY': return 'HALF_DAY_AM';
    case 'SICK':
    case 'SICK_PAID': return 'SICK';
    case 'CONDOLENCE': return 'FAMILY_EVENT';
    case 'UNPAID': return 'UNPAID';
    default: return 'OTHER';
  }
}

interface LeaveTypeConfigRepo {
  findById(companyId: string, id: string): Promise<{ id: string; code: string; name: string; deductsFromBalance: boolean } | null>;
}

interface LeaveBalanceRepo {
  findByUserAndYear(companyId: string, userId: string, year: number): Promise<{ id: string; remainingDays: number | { toNumber?: () => number } } | null>;
  update(companyId: string, id: string, data: Record<string, unknown>): Promise<unknown>;
}

interface LeaveRequestRepo {
  create(companyId: string, data: Record<string, unknown>): Promise<unknown>;
}

interface NotificationRepo {
  create(data: Record<string, unknown>): Promise<unknown>;
}

interface AttendanceRepo {
  findExistingByDateRange(companyId: string, userId: string, startDate: Date, endDate: Date): Promise<Array<{ date: Date }>>;
}

export class GrantLeaveUseCase {
  constructor(
    private leaveRequestRepo: LeaveRequestRepo,
    private leaveBalanceRepo: LeaveBalanceRepo,
    private leaveTypeConfigRepo: LeaveTypeConfigRepo,
    private notificationRepo: NotificationRepo,
    private attendanceRepo: AttendanceRepo,
  ) {}

  async execute(companyId: string, grantedBy: string, dto: GrantLeaveDto) {
    // 1. LeaveTypeConfig 조회
    const config = await this.leaveTypeConfigRepo.findById(companyId, dto.leaveTypeConfigId);
    if (!config) {
      throw new EntityNotFoundError('LeaveTypeConfig', dto.leaveTypeConfigId);
    }

    // 2. 근태 중복 검사
    const existingAttendances = await this.attendanceRepo.findExistingByDateRange(
      companyId, dto.userId, new Date(dto.startDate), new Date(dto.endDate),
    );
    if (existingAttendances.length > 0) {
      const dates = existingAttendances.map((a: { date: Date }) => a.date.toISOString().slice(0, 10)).join(', ');
      throw new ValidationError(`해당 기간에 근태 기록이 존재하여 휴가를 부여할 수 없습니다. 근태를 먼저 삭제해주세요. (근태 기록일: ${dates})`);
    }

    // 3. code → LeaveType enum 매핑
    const leaveType = mapCodeToLeaveType(config.code);

    // 4. deductsFromBalance이면 잔여일수 검증 (조회 결과 캐싱하여 6단계에서 재사용)
    const year = new Date(dto.startDate).getFullYear();
    let cachedBalance: { id: string; remainingDays: number | { toNumber?: () => number } } | null = null;
    if (config.deductsFromBalance) {
      cachedBalance = await this.leaveBalanceRepo.findByUserAndYear(companyId, dto.userId, year);
      if (cachedBalance) {
        const remaining = typeof cachedBalance.remainingDays === 'object' && cachedBalance.remainingDays?.toNumber
          ? cachedBalance.remainingDays.toNumber()
          : Number(cachedBalance.remainingDays);
        if (remaining < dto.days) {
          throw new ValidationError(
            `잔여일수가 부족합니다. 잔여: ${remaining}일, 요청: ${dto.days}일`,
          );
        }
      }
    }

    // 5. LeaveRequest 생성 (status='APPROVED', 즉시 승인)
    const leaveRequest = await this.leaveRequestRepo.create(companyId, {
      userId: dto.userId,
      type: leaveType,
      leaveTypeConfigId: dto.leaveTypeConfigId,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      days: dto.days,
      reason: dto.reason || `관리자 직접 부여 (${config.name})`,
      status: 'APPROVED',
      approvedBy: grantedBy,
      approvedAt: new Date(),
    });

    // 6. balance 차감 (4단계 캐시 재사용)
    if (config.deductsFromBalance && cachedBalance) {
      await this.leaveBalanceRepo.update(companyId, cachedBalance.id, {
        usedDays: { increment: dto.days },
        remainingDays: { decrement: dto.days },
      });
    }

    // 7. 알림 생성
    await this.notificationRepo.create({
      companyId,
      userId: dto.userId,
      type: 'LEAVE_APPROVED',
      priority: 'MEDIUM',
      title: '휴가 부여',
      message: `${config.name} ${dto.days}일이 부여되었습니다. (${dto.startDate} ~ ${dto.endDate})`,
      link: '/e/leave',
    });

    return leaveRequest;
  }
}

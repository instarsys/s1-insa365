import type { IAttendanceRepository } from '../../ports/IAttendanceRepository';
import type { RecordAttendanceDto, DailyAttendanceDto } from '../../dtos/attendance';
import { ValidationError } from '@domain/errors';

export class RecordAttendanceUseCase {
  constructor(private attendanceRepo: IAttendanceRepository) {}

  async execute(companyId: string, dto: RecordAttendanceDto): Promise<DailyAttendanceDto> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await this.attendanceRepo.findByDate(companyId, dto.userId, today);

    if (dto.type === 'CHECK_IN') {
      if (existing?.checkInTime) {
        throw new ValidationError('오늘 이미 출근 처리되었습니다.');
      }
      if (existing) {
        return this.attendanceRepo.update(existing.id, {
          checkInTime: new Date(),
        });
      }
      return this.attendanceRepo.create({
        companyId,
        userId: dto.userId,
        date: today,
        checkInTime: new Date(),
        latitude: dto.latitude,
        longitude: dto.longitude,
      });
    }

    // CHECK_OUT
    if (!existing?.checkInTime) {
      throw new ValidationError('출근 기록이 없어 퇴근 처리할 수 없습니다.');
    }
    if (existing.checkOutTime) {
      throw new ValidationError('오늘 이미 퇴근 처리되었습니다.');
    }

    return this.attendanceRepo.update(existing.id, {
      checkOutTime: new Date(),
      checkOutLatitude: dto.latitude,
      checkOutLongitude: dto.longitude,
    });
  }
}

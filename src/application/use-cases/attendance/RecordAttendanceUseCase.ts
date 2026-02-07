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
        throw new ValidationError('Already checked in today');
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
      throw new ValidationError('Must check in before checking out');
    }
    if (existing.checkOutTime) {
      throw new ValidationError('Already checked out today');
    }

    return this.attendanceRepo.update(existing.id, {
      checkOutTime: new Date(),
      checkOutLatitude: dto.latitude,
      checkOutLongitude: dto.longitude,
    });
  }
}

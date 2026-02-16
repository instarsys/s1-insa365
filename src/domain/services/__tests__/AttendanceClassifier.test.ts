import { describe, it, expect } from 'vitest';
import {
  AttendanceClassifier,
  timeStringToDate,
  overlapMinutes,
  isWorkDay,
  countWorkDaysInMonth,
  type ClassifyInput,
} from '../AttendanceClassifier';

// ─── Helper: 기본 입력 생성 ─────────────────────────────────────

const baseDate = new Date(2026, 2, 2); // 2026-03-02 Monday

function makeInput(overrides: Partial<ClassifyInput> = {}): ClassifyInput {
  return {
    date: baseDate,
    checkInTime: timeStringToDate(baseDate, '09:00'),
    checkOutTime: timeStringToDate(baseDate, '18:00'),
    workPolicy: {
      startTime: '09:00',
      endTime: '18:00',
      breakMinutes: 60,
      workDays: '1,2,3,4,5',
    },
    company: {
      lateGraceMinutes: 0,
      earlyLeaveGraceMinutes: 0,
      nightWorkStartTime: '22:00',
      nightWorkEndTime: '06:00',
      overtimeThresholdMinutes: 480,
    },
    isHoliday: false,
    ...overrides,
  };
}

// ─── Utility Function Tests ─────────────────────────────────────

describe('timeStringToDate', () => {
  it('should parse HH:MM to Date on given date', () => {
    const d = new Date(2026, 0, 15);
    const result = timeStringToDate(d, '09:30');
    expect(result.getHours()).toBe(9);
    expect(result.getMinutes()).toBe(30);
    expect(result.getSeconds()).toBe(0);
  });

  it('should handle midnight', () => {
    const d = new Date(2026, 0, 15);
    const result = timeStringToDate(d, '00:00');
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
  });
});

describe('overlapMinutes', () => {
  const d = new Date(2026, 0, 15);

  it('should return overlap between two intersecting intervals', () => {
    const a1 = timeStringToDate(d, '09:00');
    const a2 = timeStringToDate(d, '18:00');
    const b1 = timeStringToDate(d, '14:00');
    const b2 = timeStringToDate(d, '20:00');
    expect(overlapMinutes(a1, a2, b1, b2)).toBe(240); // 14:00~18:00 = 4h
  });

  it('should return 0 for non-overlapping intervals', () => {
    const a1 = timeStringToDate(d, '09:00');
    const a2 = timeStringToDate(d, '12:00');
    const b1 = timeStringToDate(d, '14:00');
    const b2 = timeStringToDate(d, '18:00');
    expect(overlapMinutes(a1, a2, b1, b2)).toBe(0);
  });

  it('should return 0 when intervals just touch', () => {
    const a1 = timeStringToDate(d, '09:00');
    const a2 = timeStringToDate(d, '12:00');
    const b1 = timeStringToDate(d, '12:00');
    const b2 = timeStringToDate(d, '18:00');
    expect(overlapMinutes(a1, a2, b1, b2)).toBe(0);
  });

  it('should handle contained intervals', () => {
    const a1 = timeStringToDate(d, '09:00');
    const a2 = timeStringToDate(d, '18:00');
    const b1 = timeStringToDate(d, '10:00');
    const b2 = timeStringToDate(d, '12:00');
    expect(overlapMinutes(a1, a2, b1, b2)).toBe(120);
  });
});

describe('isWorkDay', () => {
  it('should return true for Monday with default workDays', () => {
    const mon = new Date(2026, 2, 2); // Monday
    expect(isWorkDay(mon, '1,2,3,4,5')).toBe(true);
  });

  it('should return false for Saturday with default workDays', () => {
    const sat = new Date(2026, 2, 7); // Saturday
    expect(isWorkDay(sat, '1,2,3,4,5')).toBe(false);
  });

  it('should return false for Sunday with default workDays', () => {
    const sun = new Date(2026, 2, 8); // Sunday
    expect(isWorkDay(sun, '1,2,3,4,5')).toBe(false);
  });

  it('should handle Saturday included in workDays', () => {
    const sat = new Date(2026, 2, 7); // Saturday
    expect(isWorkDay(sat, '1,2,3,4,5,6')).toBe(true);
  });

  it('should handle all days as work days', () => {
    const sun = new Date(2026, 2, 8); // Sunday
    expect(isWorkDay(sun, '1,2,3,4,5,6,7')).toBe(true);
  });
});

describe('countWorkDaysInMonth', () => {
  it('should count work days in March 2026', () => {
    // March 2026: starts on Sunday
    // Mon-Fri: 22 work days
    const count = countWorkDaysInMonth(2026, 3, '1,2,3,4,5');
    expect(count).toBe(22);
  });

  it('should count all days for 7-day work week', () => {
    const count = countWorkDaysInMonth(2026, 3, '1,2,3,4,5,6,7');
    expect(count).toBe(31);
  });
});

// ─── AttendanceClassifier.classify Tests ────────────────────────

describe('AttendanceClassifier.classify', () => {
  // --- 1. Normal Cases ---

  it('정시 출퇴근 → ON_TIME, regular=480', () => {
    const result = AttendanceClassifier.classify(makeInput());
    expect(result.status).toBe('ON_TIME');
    expect(result.regularMinutes).toBe(480); // 9h - 1h break = 8h
    expect(result.overtimeMinutes).toBe(0);
    expect(result.nightMinutes).toBe(0);
    expect(result.lateMinutes).toBe(0);
    expect(result.earlyLeaveMinutes).toBe(0);
    expect(result.totalMinutes).toBe(480);
  });

  // --- 2. Late Detection ---

  it('지각 (grace 0분): 09:30 출근 → LATE, lateMinutes=30', () => {
    const result = AttendanceClassifier.classify(
      makeInput({
        checkInTime: timeStringToDate(baseDate, '09:30'),
      }),
    );
    expect(result.status).toBe('LATE');
    expect(result.lateMinutes).toBe(30);
    expect(result.totalMinutes).toBe(450); // 8.5h - 1h = 7.5h
  });

  it('지각 (grace 5분): 09:04 출근 → ON_TIME', () => {
    const result = AttendanceClassifier.classify(
      makeInput({
        checkInTime: timeStringToDate(baseDate, '09:04'),
        company: {
          lateGraceMinutes: 5,
          earlyLeaveGraceMinutes: 0,
          nightWorkStartTime: '22:00',
          nightWorkEndTime: '06:00',
          overtimeThresholdMinutes: 480,
        },
      }),
    );
    expect(result.status).toBe('ON_TIME');
    expect(result.lateMinutes).toBe(0);
  });

  it('지각 (grace 5분): 09:06 출근 → LATE', () => {
    const result = AttendanceClassifier.classify(
      makeInput({
        checkInTime: timeStringToDate(baseDate, '09:06'),
        company: {
          lateGraceMinutes: 5,
          earlyLeaveGraceMinutes: 0,
          nightWorkStartTime: '22:00',
          nightWorkEndTime: '06:00',
          overtimeThresholdMinutes: 480,
        },
      }),
    );
    expect(result.status).toBe('LATE');
    expect(result.lateMinutes).toBe(6);
  });

  it('지각 (grace 10분): 09:10 출근 → ON_TIME', () => {
    const result = AttendanceClassifier.classify(
      makeInput({
        checkInTime: timeStringToDate(baseDate, '09:10'),
        company: {
          lateGraceMinutes: 10,
          earlyLeaveGraceMinutes: 0,
          nightWorkStartTime: '22:00',
          nightWorkEndTime: '06:00',
          overtimeThresholdMinutes: 480,
        },
      }),
    );
    expect(result.status).toBe('ON_TIME');
    expect(result.lateMinutes).toBe(0);
  });

  // --- 3. Early Leave Detection ---

  it('조퇴: 16:00 퇴근 → EARLY_LEAVE, earlyLeaveMinutes=120', () => {
    const result = AttendanceClassifier.classify(
      makeInput({
        checkOutTime: timeStringToDate(baseDate, '16:00'),
      }),
    );
    expect(result.status).toBe('EARLY_LEAVE');
    expect(result.earlyLeaveMinutes).toBe(120);
    expect(result.totalMinutes).toBe(360); // 7h - 1h = 6h
  });

  it('조퇴 (grace 10분): 17:55 퇴근 → ON_TIME', () => {
    const result = AttendanceClassifier.classify(
      makeInput({
        checkOutTime: timeStringToDate(baseDate, '17:55'),
        company: {
          lateGraceMinutes: 0,
          earlyLeaveGraceMinutes: 10,
          nightWorkStartTime: '22:00',
          nightWorkEndTime: '06:00',
          overtimeThresholdMinutes: 480,
        },
      }),
    );
    expect(result.status).toBe('ON_TIME');
    expect(result.earlyLeaveMinutes).toBe(0);
  });

  // --- 4. Late + Early Leave ---

  it('지각+조퇴 동시 → LATE (우선순위)', () => {
    const result = AttendanceClassifier.classify(
      makeInput({
        checkInTime: timeStringToDate(baseDate, '10:00'),
        checkOutTime: timeStringToDate(baseDate, '16:00'),
      }),
    );
    expect(result.status).toBe('LATE');
    expect(result.lateMinutes).toBe(60);
    expect(result.earlyLeaveMinutes).toBe(120);
  });

  // --- 5. Overtime ---

  it('연장근무 09:00~20:00 → regular=480, overtime=120', () => {
    const result = AttendanceClassifier.classify(
      makeInput({
        checkOutTime: timeStringToDate(baseDate, '20:00'),
      }),
    );
    expect(result.status).toBe('ON_TIME');
    expect(result.regularMinutes).toBe(480);
    expect(result.overtimeMinutes).toBe(120); // 11h - 1h break = 10h, 10h-8h=2h OT
    expect(result.totalMinutes).toBe(600);
  });

  // --- 6. Night Work ---

  it('야간근무 09:00~23:00 → regular=480, overtime=240, nightOvertime=60', () => {
    // 09:00~23:00 = 14h raw. Night: 22:00~23:00 = 60min.
    // Day: 14h - 60min = 780min. Day after break: 780 - 60 = 720min.
    // Total = 720 + 60 = 780min.
    // Regular: 480 (all day). Overtime: 300 - 60 night = 240 day OT.
    // NightOvertime: 60 (22:00~23:00 is overtime zone since regular filled by day).
    const result = AttendanceClassifier.classify(
      makeInput({
        checkOutTime: timeStringToDate(baseDate, '23:00'),
      }),
    );
    expect(result.status).toBe('ON_TIME');
    expect(result.totalMinutes).toBe(780); // 720 day + 60 night
    expect(result.regularMinutes).toBe(480);
    expect(result.overtimeMinutes).toBe(240);
    expect(result.nightOvertimeMinutes).toBe(60);
  });

  // --- 7. Holiday Work ---

  it('휴일근무 ≤8h → holidayMinutes', () => {
    const result = AttendanceClassifier.classify(
      makeInput({
        isHoliday: true,
        checkInTime: timeStringToDate(baseDate, '10:00'),
        checkOutTime: timeStringToDate(baseDate, '17:00'),
        workPolicy: {
          startTime: '09:00',
          endTime: '18:00',
          breakMinutes: 60,
          workDays: '1,2,3,4,5',
        },
      }),
    );
    expect(result.status).toBe('HOLIDAY');
    expect(result.holidayMinutes).toBe(360); // 7h - 1h = 6h
    expect(result.holidayOvertimeMinutes).toBe(0);
    expect(result.regularMinutes).toBe(0);
    expect(result.lateMinutes).toBe(0);
  });

  it('휴일근무 >8h → holidayMinutes + holidayOvertimeMinutes', () => {
    const result = AttendanceClassifier.classify(
      makeInput({
        isHoliday: true,
        checkInTime: timeStringToDate(baseDate, '08:00'),
        checkOutTime: timeStringToDate(baseDate, '20:00'),
        workPolicy: {
          startTime: '09:00',
          endTime: '18:00',
          breakMinutes: 60,
          workDays: '1,2,3,4,5',
        },
      }),
    );
    expect(result.status).toBe('HOLIDAY');
    const total = result.holidayMinutes + result.holidayOvertimeMinutes;
    expect(total).toBe(660); // 12h - 1h = 11h
    expect(result.holidayMinutes).toBe(480); // first 8h
    expect(result.holidayOvertimeMinutes).toBe(180); // 3h over
  });

  it('휴일+야간 → holidayNight 분류', () => {
    const result = AttendanceClassifier.classify(
      makeInput({
        isHoliday: true,
        checkInTime: timeStringToDate(baseDate, '20:00'),
        checkOutTime: timeStringToDate(baseDate, '23:00'),
        workPolicy: {
          startTime: '09:00',
          endTime: '18:00',
          breakMinutes: 0,
          workDays: '1,2,3,4,5',
        },
      }),
    );
    expect(result.status).toBe('HOLIDAY');
    expect(result.totalMinutes).toBe(180);
    // 20:00~22:00 = day, 22:00~23:00 = night
    expect(result.holidayMinutes).toBe(120); // 2h day within 8h
    expect(result.holidayNightMinutes).toBe(60); // 1h night within 8h
  });

  // --- 8. Break Time ---

  it('휴게시간 0분', () => {
    const result = AttendanceClassifier.classify(
      makeInput({
        workPolicy: {
          startTime: '09:00',
          endTime: '18:00',
          breakMinutes: 0,
          workDays: '1,2,3,4,5',
        },
      }),
    );
    expect(result.totalMinutes).toBe(540); // 9h, no break
    expect(result.regularMinutes).toBe(480);
    expect(result.overtimeMinutes).toBe(60);
  });

  it('휴게시간 30분', () => {
    const result = AttendanceClassifier.classify(
      makeInput({
        workPolicy: {
          startTime: '09:00',
          endTime: '18:00',
          breakMinutes: 30,
          workDays: '1,2,3,4,5',
        },
      }),
    );
    expect(result.totalMinutes).toBe(510); // 9h - 30m = 8.5h
    expect(result.regularMinutes).toBe(480);
    expect(result.overtimeMinutes).toBe(30);
  });

  // --- 9. workDays auto holiday detection ---

  it('workDays 기반 자동 휴일 판정은 isHoliday로 전달', () => {
    // Saturday (non-workday) is passed as isHoliday=true by the API
    const sat = new Date(2026, 2, 7); // Saturday
    const result = AttendanceClassifier.classify(
      makeInput({
        date: sat,
        isHoliday: true,
        checkInTime: timeStringToDate(sat, '09:00'),
        checkOutTime: timeStringToDate(sat, '13:00'),
        workPolicy: {
          startTime: '09:00',
          endTime: '18:00',
          breakMinutes: 0,
          workDays: '1,2,3,4,5',
        },
      }),
    );
    expect(result.status).toBe('HOLIDAY');
    expect(result.holidayMinutes).toBe(240);
  });

  // --- 10. Edge Cases ---

  it('checkIn = checkOut → totalMinutes=0', () => {
    const t = timeStringToDate(baseDate, '09:00');
    const result = AttendanceClassifier.classify(
      makeInput({
        checkInTime: t,
        checkOutTime: t,
      }),
    );
    expect(result.totalMinutes).toBe(0);
    expect(result.regularMinutes).toBe(0);
  });

  it('breakMinutes > 실제 근무시간 → totalMinutes=0', () => {
    const result = AttendanceClassifier.classify(
      makeInput({
        checkInTime: timeStringToDate(baseDate, '09:00'),
        checkOutTime: timeStringToDate(baseDate, '09:30'),
        workPolicy: {
          startTime: '09:00',
          endTime: '18:00',
          breakMinutes: 60,
          workDays: '1,2,3,4,5',
        },
      }),
    );
    expect(result.totalMinutes).toBe(0);
    expect(result.regularMinutes).toBe(0);
  });

  it('짧은 근무 (2시간, 휴게 0분)', () => {
    const result = AttendanceClassifier.classify(
      makeInput({
        checkInTime: timeStringToDate(baseDate, '09:00'),
        checkOutTime: timeStringToDate(baseDate, '11:00'),
        workPolicy: {
          startTime: '09:00',
          endTime: '18:00',
          breakMinutes: 0,
          workDays: '1,2,3,4,5',
        },
      }),
    );
    expect(result.status).toBe('EARLY_LEAVE');
    expect(result.totalMinutes).toBe(120);
    expect(result.regularMinutes).toBe(120);
    expect(result.overtimeMinutes).toBe(0);
  });

  it('정확히 threshold 시간 근무 → overtime=0', () => {
    const result = AttendanceClassifier.classify(
      makeInput({
        checkInTime: timeStringToDate(baseDate, '09:00'),
        checkOutTime: timeStringToDate(baseDate, '18:00'),
        workPolicy: {
          startTime: '09:00',
          endTime: '18:00',
          breakMinutes: 60,
          workDays: '1,2,3,4,5',
        },
      }),
    );
    expect(result.regularMinutes).toBe(480);
    expect(result.overtimeMinutes).toBe(0);
  });

  it('segments 생성 확인', () => {
    const result = AttendanceClassifier.classify(
      makeInput({
        checkOutTime: timeStringToDate(baseDate, '20:00'),
      }),
    );
    expect(result.segments.length).toBeGreaterThan(0);
    const types = result.segments.map((s) => s.type);
    expect(types).toContain('REGULAR');
    expect(types).toContain('OVERTIME');
  });

  it('holiday segments 생성 확인', () => {
    const result = AttendanceClassifier.classify(
      makeInput({
        isHoliday: true,
        workPolicy: {
          startTime: '09:00',
          endTime: '18:00',
          breakMinutes: 60,
          workDays: '1,2,3,4,5',
        },
      }),
    );
    const types = result.segments.map((s) => s.type);
    expect(types).toContain('HOLIDAY');
    expect(types).not.toContain('REGULAR');
  });

  // --- 11. Night shift edge cases ---

  it('야간 전용 근무 (22:00~06:00): 전부 night, break는 주간에서 차감되므로 480분', () => {
    // 22:00~06:00 = 480 min raw. Night overlap = 480 min.
    // Day = 0 min, break applied to day = max(0, 0-60)=0.
    // Total = 0 + 480 = 480 min (야간 전용이라 break 무효)
    const result = AttendanceClassifier.classify(
      makeInput({
        checkInTime: timeStringToDate(baseDate, '22:00'),
        checkOutTime: (() => {
          const nextDay = new Date(baseDate);
          nextDay.setDate(nextDay.getDate() + 1);
          return timeStringToDate(nextDay, '06:00');
        })(),
        workPolicy: {
          startTime: '22:00',
          endTime: '06:00',
          breakMinutes: 60,
          workDays: '1,2,3,4,5',
        },
      }),
    );
    expect(result.totalMinutes).toBe(480); // 8h, break doesn't apply to night
    const nightTotal = result.nightMinutes + result.nightOvertimeMinutes;
    expect(nightTotal).toBe(480);
    expect(result.regularMinutes).toBe(0);
  });

  // --- 12. Custom overtime threshold ---

  it('overtimeThresholdMinutes=360: 7h work → 1h overtime', () => {
    const result = AttendanceClassifier.classify(
      makeInput({
        checkInTime: timeStringToDate(baseDate, '09:00'),
        checkOutTime: timeStringToDate(baseDate, '17:00'),
        workPolicy: {
          startTime: '09:00',
          endTime: '18:00',
          breakMinutes: 60,
          workDays: '1,2,3,4,5',
        },
        company: {
          lateGraceMinutes: 0,
          earlyLeaveGraceMinutes: 0,
          nightWorkStartTime: '22:00',
          nightWorkEndTime: '06:00',
          overtimeThresholdMinutes: 360,
        },
      }),
    );
    expect(result.totalMinutes).toBe(420); // 8h - 1h = 7h
    expect(result.regularMinutes).toBe(360);
    expect(result.overtimeMinutes).toBe(60);
  });

  // --- 13. Half day work ---

  it('반일 근무 (4시간)', () => {
    const result = AttendanceClassifier.classify(
      makeInput({
        checkInTime: timeStringToDate(baseDate, '09:00'),
        checkOutTime: timeStringToDate(baseDate, '13:00'),
        workPolicy: {
          startTime: '09:00',
          endTime: '18:00',
          breakMinutes: 0,
          workDays: '1,2,3,4,5',
        },
      }),
    );
    expect(result.totalMinutes).toBe(240);
    expect(result.regularMinutes).toBe(240);
    expect(result.overtimeMinutes).toBe(0);
    expect(result.status).toBe('EARLY_LEAVE');
  });
});

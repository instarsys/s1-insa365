/**
 * AttendanceClassifier — 근태 판정 + 시간 세분화 도메인 서비스.
 *
 * 출퇴근 시간과 근무정책(WorkPolicy)을 기반으로:
 * 1. 지각/조퇴/휴일 판정
 * 2. 정규/연장/야간/휴일 시간 세분화 (8가지 minutes)
 * 3. AttendanceSegment 생성
 *
 * 순수 TypeScript — 외부 의존성 없음 (PremiumCalculator와 동일 패턴).
 */

export interface ClassifyInput {
  checkInTime: Date;
  checkOutTime: Date;
  workPolicy: {
    startTime: string;   // "HH:MM" e.g. "09:00"
    endTime: string;     // "HH:MM" e.g. "18:00"
    breakMinutes: number;
    workDays: string;    // "1,2,3,4,5" (1=Mon..7=Sun)
    lateGraceMinutes: number;       // default 0
    earlyLeaveGraceMinutes: number; // default 0
    nightWorkStartTime: string;     // default "22:00"
    nightWorkEndTime: string;       // default "06:00"
    overtimeThresholdMinutes: number; // default 480
  };
  isHoliday: boolean;
  date: Date;
}

export type AttendanceStatusType = 'ON_TIME' | 'LATE' | 'EARLY_LEAVE' | 'HOLIDAY';

export interface SegmentOutput {
  startTime: Date;
  endTime: Date;
  type: string;
  minutes: number;
}

export interface ClassifyResult {
  status: AttendanceStatusType;
  regularMinutes: number;
  overtimeMinutes: number;
  nightMinutes: number;
  nightOvertimeMinutes: number;
  holidayMinutes: number;
  holidayOvertimeMinutes: number;
  holidayNightMinutes: number;
  holidayNightOvertimeMinutes: number;
  totalMinutes: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  segments: SegmentOutput[];
}

// ─── Utility Functions ──────────────────────────────────────────

/**
 * Parse "HH:MM" string into a Date on the given date.
 * If the time is before a reference (for night shifts), rolls to next day.
 */
export function timeStringToDate(date: Date, timeStr: string): Date {
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
}

/**
 * Calculate overlap in minutes between two intervals [aStart, aEnd) and [bStart, bEnd).
 * Returns 0 if no overlap.
 */
export function overlapMinutes(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): number {
  const start = aStart > bStart ? aStart : bStart;
  const end = aEnd < bEnd ? aEnd : bEnd;
  const diff = end.getTime() - start.getTime();
  return diff > 0 ? Math.floor(diff / 60000) : 0;
}

/**
 * Check if a date is a work day according to workDays string.
 * workDays: "1,2,3,4,5" where 1=Monday..7=Sunday
 * JS getDay(): 0=Sunday, 1=Monday..6=Saturday
 */
export function isWorkDay(date: Date, workDays: string): boolean {
  const jsDay = date.getDay(); // 0=Sun..6=Sat
  const isoDay = jsDay === 0 ? 7 : jsDay; // 1=Mon..7=Sun
  const workDayNums = workDays.split(',').map(Number);
  return workDayNums.includes(isoDay);
}

/**
 * Count work days in a given month based on workDays policy.
 */
export function countWorkDaysInMonth(
  year: number,
  month: number,
  workDays: string,
): number {
  const daysInMonth = new Date(year, month, 0).getDate();
  let count = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);
    if (isWorkDay(date, workDays)) count++;
  }
  return count;
}

// ─── Main Classifier ────────────────────────────────────────────

export class AttendanceClassifier {
  /**
   * Classify a single day's attendance.
   */
  static classify(input: ClassifyInput): ClassifyResult {
    const {
      checkInTime,
      checkOutTime,
      workPolicy,
      isHoliday,
      date,
    } = input;

    // Parse policy times
    const policyStart = timeStringToDate(date, workPolicy.startTime);
    const policyEnd = timeStringToDate(date, workPolicy.endTime);
    // If policy end is before start (overnight shift), push to next day
    if (policyEnd <= policyStart) {
      policyEnd.setDate(policyEnd.getDate() + 1);
    }

    // Night work window: e.g. 22:00 today ~ 06:00 tomorrow
    const nightStart = timeStringToDate(date, workPolicy.nightWorkStartTime);
    const nightEnd = timeStringToDate(date, workPolicy.nightWorkEndTime);
    // Night end is always next day (22:00~06:00)
    if (nightEnd <= nightStart) {
      nightEnd.setDate(nightEnd.getDate() + 1);
    }

    // Total work duration: break deducted from day portion only
    const rawMinutes = Math.floor(
      (checkOutTime.getTime() - checkInTime.getTime()) / 60000,
    );
    const nightOverlapForTotal = overlapMinutes(checkInTime, checkOutTime, nightStart, nightEnd);
    const nightStartP = new Date(nightStart.getTime() - 24 * 60 * 60000);
    const nightEndP = new Date(nightEnd.getTime() - 24 * 60 * 60000);
    const nightOverlapPrevForTotal = overlapMinutes(checkInTime, checkOutTime, nightStartP, nightEndP);
    const nightRaw = nightOverlapForTotal + nightOverlapPrevForTotal;
    const dayRawForTotal = rawMinutes - nightRaw;
    const dayAfterBreak = Math.max(0, dayRawForTotal - workPolicy.breakMinutes);
    const totalMinutes = dayAfterBreak + nightRaw;

    // Late / early leave detection
    let lateMinutes = 0;
    let earlyLeaveMinutes = 0;
    let status: AttendanceStatusType;

    if (isHoliday) {
      status = 'HOLIDAY';
    } else {
      // Late: checkIn after policyStart + grace
      const lateThreshold = new Date(
        policyStart.getTime() + workPolicy.lateGraceMinutes * 60000,
      );
      if (checkInTime > lateThreshold) {
        lateMinutes = Math.floor(
          (checkInTime.getTime() - policyStart.getTime()) / 60000,
        );
      }

      // Early leave: checkOut before policyEnd - grace
      const earlyThreshold = new Date(
        policyEnd.getTime() - workPolicy.earlyLeaveGraceMinutes * 60000,
      );
      if (checkOutTime < earlyThreshold) {
        earlyLeaveMinutes = Math.floor(
          (policyEnd.getTime() - checkOutTime.getTime()) / 60000,
        );
      }

      // Status determination: LATE takes priority over EARLY_LEAVE
      if (lateMinutes > 0) {
        status = 'LATE';
      } else if (earlyLeaveMinutes > 0) {
        status = 'EARLY_LEAVE';
      } else {
        status = 'ON_TIME';
      }
    }

    // Segment calculation
    const segments: SegmentOutput[] = [];
    const threshold = workPolicy.overtimeThresholdMinutes;

    if (isHoliday) {
      // ─── Holiday work ───
      const result = classifyHoliday(
        checkInTime,
        checkOutTime,
        workPolicy.breakMinutes,
        nightStart,
        nightEnd,
        threshold,
      );
      segments.push(...result.segments);

      return {
        status,
        regularMinutes: 0,
        overtimeMinutes: 0,
        nightMinutes: 0,
        nightOvertimeMinutes: 0,
        holidayMinutes: result.holidayMinutes,
        holidayOvertimeMinutes: result.holidayOvertimeMinutes,
        holidayNightMinutes: result.holidayNightMinutes,
        holidayNightOvertimeMinutes: result.holidayNightOvertimeMinutes,
        totalMinutes,
        lateMinutes: 0,
        earlyLeaveMinutes: 0,
        segments,
      };
    }

    // ─── Normal work day ───
    const result = classifyNormal(
      checkInTime,
      checkOutTime,
      workPolicy.breakMinutes,
      nightStart,
      nightEnd,
      threshold,
    );
    segments.push(...result.segments);

    return {
      status,
      regularMinutes: result.regularMinutes,
      overtimeMinutes: result.overtimeMinutes,
      nightMinutes: result.nightMinutes,
      nightOvertimeMinutes: result.nightOvertimeMinutes,
      holidayMinutes: 0,
      holidayOvertimeMinutes: 0,
      holidayNightMinutes: 0,
      holidayNightOvertimeMinutes: 0,
      totalMinutes,
      lateMinutes,
      earlyLeaveMinutes,
      segments,
    };
  }
}

// ─── Internal Helpers ───────────────────────────────────────────

interface NormalResult {
  regularMinutes: number;
  overtimeMinutes: number;
  nightMinutes: number;
  nightOvertimeMinutes: number;
  segments: SegmentOutput[];
}

interface HolidayResult {
  holidayMinutes: number;
  holidayOvertimeMinutes: number;
  holidayNightMinutes: number;
  holidayNightOvertimeMinutes: number;
  segments: SegmentOutput[];
}

/**
 * Classify a normal workday into regular/overtime/night/nightOvertime.
 *
 * Algorithm:
 * 1. Calculate night overlap (야간 22:00~06:00)
 * 2. Day portion = raw - night, deduct break from day portion only
 * 3. totalWork = dayAfterBreak + nightPortion
 * 4. Fill regular up to threshold from day first, then night
 * 5. Remaining goes to overtime / nightOvertime
 */
function classifyNormal(
  checkIn: Date,
  checkOut: Date,
  breakMinutes: number,
  nightStart: Date,
  nightEnd: Date,
  threshold: number,
): NormalResult {
  const rawMinutes = Math.floor(
    (checkOut.getTime() - checkIn.getTime()) / 60000,
  );

  // Calculate night overlap with the actual work interval
  const nightOverlap = overlapMinutes(checkIn, checkOut, nightStart, nightEnd);
  // Also check night window from the previous day (e.g. for early morning work)
  const nightStartPrev = new Date(nightStart.getTime() - 24 * 60 * 60000);
  const nightEndPrev = new Date(nightEnd.getTime() - 24 * 60 * 60000);
  const nightOverlapPrev = overlapMinutes(checkIn, checkOut, nightStartPrev, nightEndPrev);
  const nightPortion = nightOverlap + nightOverlapPrev;

  // Break is deducted from day portion only (Korean labor law convention)
  const dayRaw = rawMinutes - nightPortion;
  const dayPortion = Math.max(0, dayRaw - breakMinutes);
  const totalWork = dayPortion + nightPortion;

  if (totalWork === 0) {
    return {
      regularMinutes: 0,
      overtimeMinutes: 0,
      nightMinutes: 0,
      nightOvertimeMinutes: 0,
      segments: [],
    };
  }

  // Regular = min(totalWork, threshold)
  const regularTotal = Math.min(totalWork, threshold);
  const overtimeTotal = Math.max(0, totalWork - threshold);

  // Day portion fills regular first
  const regularDay = Math.min(dayPortion, regularTotal);
  const regularNight = regularTotal - regularDay;

  // Remaining night goes to overtime
  const overtimeNight = nightPortion - regularNight;
  const overtimeDay = overtimeTotal - Math.max(0, overtimeNight);

  const regularMinutes = regularDay;
  const nightMinutes = Math.max(0, regularNight);
  const overtimeMinutes = Math.max(0, overtimeDay);
  const nightOvertimeMinutes = Math.max(0, overtimeNight);

  const segments: SegmentOutput[] = [];
  if (regularMinutes > 0) {
    segments.push({ startTime: checkIn, endTime: checkOut, type: 'REGULAR', minutes: regularMinutes });
  }
  if (overtimeMinutes > 0) {
    segments.push({ startTime: checkIn, endTime: checkOut, type: 'OVERTIME', minutes: overtimeMinutes });
  }
  if (nightMinutes > 0) {
    segments.push({ startTime: checkIn, endTime: checkOut, type: 'NIGHT', minutes: nightMinutes });
  }
  if (nightOvertimeMinutes > 0) {
    segments.push({ startTime: checkIn, endTime: checkOut, type: 'NIGHT_OVERTIME', minutes: nightOvertimeMinutes });
  }

  return { regularMinutes, overtimeMinutes, nightMinutes, nightOvertimeMinutes, segments };
}

/**
 * Classify holiday work into holiday/holidayOvertime/holidayNight/holidayNightOvertime.
 *
 * Holiday work split:
 * - Within 8h (threshold): 1.5x base → holidayMinutes (day), holidayNightMinutes (night)
 * - Over 8h: 2.0x base → holidayOvertimeMinutes (day), holidayNightOvertimeMinutes (night)
 */
function classifyHoliday(
  checkIn: Date,
  checkOut: Date,
  breakMinutes: number,
  nightStart: Date,
  nightEnd: Date,
  threshold: number,
): HolidayResult {
  const rawMinutes = Math.floor(
    (checkOut.getTime() - checkIn.getTime()) / 60000,
  );

  // Night overlap calculation
  const nightOverlap = overlapMinutes(checkIn, checkOut, nightStart, nightEnd);
  const nightStartPrev = new Date(nightStart.getTime() - 24 * 60 * 60000);
  const nightEndPrev = new Date(nightEnd.getTime() - 24 * 60 * 60000);
  const nightOverlapPrev = overlapMinutes(checkIn, checkOut, nightStartPrev, nightEndPrev);
  const nightPortion = nightOverlap + nightOverlapPrev;

  // Break deducted from day portion only
  const dayRaw = rawMinutes - nightPortion;
  const dayPortion = Math.max(0, dayRaw - breakMinutes);
  const totalWork = dayPortion + nightPortion;

  if (totalWork === 0) {
    return {
      holidayMinutes: 0,
      holidayOvertimeMinutes: 0,
      holidayNightMinutes: 0,
      holidayNightOvertimeMinutes: 0,
      segments: [],
    };
  }

  // Within threshold (holidayMinutes + holidayNightMinutes)
  const withinTotal = Math.min(totalWork, threshold);
  const overTotal = Math.max(0, totalWork - threshold);

  // Day fills within-threshold first
  const withinDay = Math.min(dayPortion, withinTotal);
  const withinNight = withinTotal - withinDay;

  const overNight = nightPortion - withinNight;
  const overDay = overTotal - Math.max(0, overNight);

  const holidayMinutes = withinDay;
  const holidayNightMinutes = Math.max(0, withinNight);
  const holidayOvertimeMinutes = Math.max(0, overDay);
  const holidayNightOvertimeMinutes = Math.max(0, overNight);

  const segments: SegmentOutput[] = [];
  if (holidayMinutes > 0) {
    segments.push({ startTime: checkIn, endTime: checkOut, type: 'HOLIDAY', minutes: holidayMinutes });
  }
  if (holidayOvertimeMinutes > 0) {
    segments.push({ startTime: checkIn, endTime: checkOut, type: 'HOLIDAY_OVERTIME', minutes: holidayOvertimeMinutes });
  }
  if (holidayNightMinutes > 0) {
    segments.push({ startTime: checkIn, endTime: checkOut, type: 'HOLIDAY_NIGHT', minutes: holidayNightMinutes });
  }
  if (holidayNightOvertimeMinutes > 0) {
    segments.push({ startTime: checkIn, endTime: checkOut, type: 'HOLIDAY_NIGHT_OVERTIME', minutes: holidayNightOvertimeMinutes });
  }

  return { holidayMinutes, holidayOvertimeMinutes, holidayNightMinutes, holidayNightOvertimeMinutes, segments };
}

/**
 * 2026년 1~2월 현실적 근태 데이터 생성 스크립트
 * - 기존 모든 근태/근태세그먼트/근태확정 데이터 삭제
 * - 2026-01, 2026-02에 대해 실제적인 출퇴근 기록 생성
 *
 * 근무정책: 09:00~18:00 KST (workDays: 1,2,3,4,5), 60분 휴게
 * KST = UTC+9 → 09:00 KST = 00:00 UTC, 18:00 KST = 09:00 UTC
 */

import pg from 'pg';
import { randomUUID } from 'crypto';

const pool = new pg.Pool({ connectionString: 'postgresql://insa365:insa365dev@localhost:5438/insa365' });

const COMPANY_ID = '2abe2f45-7ec6-4623-a472-7542144d3c21'; // 테스트 주식회사

// 활성 직원 (근태 대상)
const EMPLOYEES = [
  { id: 'f3f09300-6a0d-48c6-8669-e5e18817b996', name: '관리자',  type: 'MONTHLY' },
  { id: '87415834-6868-48b0-86c8-da1eaeb68131', name: '김영수',  type: 'MONTHLY' },
  { id: 'f0bd86dc-349c-4461-9a91-06abf790f37f', name: '박지민',  type: 'MONTHLY' },
  { id: '2daa05f1-e2c5-4898-945f-754a9ca56a9e', name: '팀장',    type: 'MONTHLY' },
  { id: 'b8a2ae66-c084-44c5-8290-07c3f80e5ae9', name: '홍파트',  type: 'HOURLY' },
  { id: '9ca45c66-9069-4041-b6b5-9c3d0e93df8c', name: '이서연',  type: 'MONTHLY' }, // ON_LEAVE
];

// 2026년 1~2월 회사 공휴일 (UTC date 기준)
const HOLIDAYS_2026 = new Set([
  '2026-01-01', // 신정
  '2026-02-16', // 설날 연휴
  '2026-02-17', // 설날
  '2026-02-18', // 설날 연휴
]);

function isWeekend(date) {
  const dow = date.getUTCDay(); // 0=Sun, 6=Sat
  return dow === 0 || dow === 6;
}

function isWorkDay(date) {
  const dateStr = date.toISOString().split('T')[0];
  return !isWeekend(date) && !HOLIDAYS_2026.has(dateStr);
}

/** 분 단위 랜덤 오프셋 (-range ~ +range) */
function randMinutes(range) {
  return Math.floor(Math.random() * (range * 2 + 1)) - range;
}

/** KST 시간을 UTC Date로 변환 (같은 날짜) */
function kstToUtc(dateStr, hours, minutes) {
  // dateStr: "2026-01-02", hours/minutes in KST
  const [y, m, d] = dateStr.split('-').map(Number);
  const kst = new Date(Date.UTC(y, m - 1, d, hours, minutes));
  // KST = UTC+9 → UTC = KST - 9h
  kst.setUTCHours(kst.getUTCHours() - 9);
  return kst;
}

function generateAttendance(empId, empName, empType, dateStr) {
  // 개인별 특성
  const isAdmin = empName === '관리자';
  const isManager = empName === '팀장';
  const isHourly = empType === 'HOURLY';
  const isSeoYeon = empName === '이서연';

  // 이서연: 2월 10일부터 휴직 (출근 안 함)
  if (isSeoYeon && dateStr >= '2026-02-10') return null;

  // 홍파트(시급제): 가끔 결근 (약 10% 확률)
  if (isHourly && Math.random() < 0.10) return null;

  // 김영수: 1월 15일 병가 결근
  if (empName === '김영수' && dateStr === '2026-01-15') return null;

  // 박지민: 2월 25일 경조사 결근
  if (empName === '박지민' && dateStr === '2026-02-25') return null;

  // 출근 시간 (KST 기준)
  let checkInH = 9, checkInM = 0;

  if (isAdmin) {
    // 관리자: 08:45~09:05 사이 (매우 정시)
    checkInM = randMinutes(5) - 10; // -15 ~ -5 → 08:45~08:55 대부분
    if (checkInM < -15) checkInM = -15;
  } else if (isManager) {
    // 팀장: 08:30~08:55 (일찍 출근)
    checkInM = -30 + Math.floor(Math.random() * 25);
  } else if (isHourly) {
    // 홍파트(시급제): 08:50~09:05 (대체로 정시)
    checkInM = randMinutes(5) - 5;
  } else if (isSeoYeon) {
    // 이서연: 08:50~09:00 (정시 출근)
    checkInM = randMinutes(5) - 5;
  } else if (empName === '김영수') {
    // 김영수: 08:50~09:05 (가끔 지각 — 월 2~3회)
    if (Math.random() < 0.08) {
      checkInM = 3 + Math.floor(Math.random() * 12); // 09:03~09:15 지각
    } else {
      checkInM = randMinutes(5) - 5; // 08:55~09:00 정시
    }
  } else if (empName === '박지민') {
    // 박지민: 08:40~08:55 (항상 일찍)
    checkInM = -20 + Math.floor(Math.random() * 15);
  }

  checkInH = 9;
  const totalCheckInMin = checkInM; // 09:00 기준 분 오프셋
  const actualCheckInH = 9 + Math.floor(totalCheckInMin / 60);
  const actualCheckInM = ((totalCheckInMin % 60) + 60) % 60;
  const checkInKstH = totalCheckInMin < 0 ? 8 : 9;
  const checkInKstM = totalCheckInMin < 0 ? 60 + totalCheckInMin : totalCheckInMin;

  // 퇴근 시간 (KST 기준)
  let checkOutH = 18, checkOutM = 0;

  if (isManager) {
    // 팀장: 18:30~19:30 (야근 많음)
    checkOutM = 30 + Math.floor(Math.random() * 60);
  } else if (isAdmin) {
    // 관리자: 18:00~18:20
    checkOutM = Math.floor(Math.random() * 20);
  } else if (isHourly) {
    // 홍파트: 18:00~18:10 (칼퇴)
    checkOutM = Math.floor(Math.random() * 10);
  } else if (empName === '김영수') {
    // 김영수: 18:00~18:30
    checkOutM = Math.floor(Math.random() * 30);
  } else if (empName === '박지민') {
    // 박지민: 18:00~18:15
    checkOutM = Math.floor(Math.random() * 15);
  } else if (isSeoYeon) {
    // 이서연: 18:00~18:10
    checkOutM = Math.floor(Math.random() * 10);
  }

  const checkOutKstH = 18 + Math.floor(checkOutM / 60);
  const checkOutKstM = checkOutM % 60;

  const checkInTime = kstToUtc(dateStr, checkInKstH, checkInKstM);
  const checkOutTime = kstToUtc(dateStr, checkOutKstH, checkOutKstM);

  // 지각 판정: 09:00 이후 체크인
  const isLate = checkInKstH > 9 || (checkInKstH === 9 && checkInKstM > 0);
  // 조퇴 판정: 18:00 이전 체크아웃
  const isEarlyLeave = checkOutKstH < 18;

  let status = 'ON_TIME';
  let lateMinutes = 0;
  let earlyLeaveMinutes = 0;

  if (isLate) {
    status = 'LATE';
    lateMinutes = (checkInKstH - 9) * 60 + checkInKstM;
  }
  if (isEarlyLeave) {
    status = 'EARLY_LEAVE';
    earlyLeaveMinutes = (18 - checkOutKstH) * 60 - checkOutKstM;
  }
  // LATE takes priority
  if (isLate && isEarlyLeave) status = 'LATE';

  // 근무 시간 계산 (분) — 점심시간 60분 제외
  const rawMinutes = Math.round((checkOutTime - checkInTime) / 60000);
  const totalMinutes = Math.max(0, rawMinutes - 60);

  // 시간 분류
  const regularMinutes = Math.min(totalMinutes, 480); // 8시간 = 480분
  const overtimeMinutes = Math.max(0, totalMinutes - 480);

  // 야간(22:00~06:00 KST) — 대부분 해당 없음
  let nightMinutes = 0;
  if (checkOutKstH >= 22) {
    nightMinutes = (checkOutKstH - 22) * 60 + checkOutKstM;
  }

  return {
    id: randomUUID(),
    company_id: COMPANY_ID,
    user_id: empId,
    date: dateStr,
    check_in_time: checkInTime.toISOString(),
    check_out_time: checkOutTime.toISOString(),
    status,
    regular_minutes: regularMinutes,
    overtime_minutes: overtimeMinutes,
    night_minutes: nightMinutes,
    night_overtime_minutes: 0,
    holiday_minutes: 0,
    holiday_overtime_minutes: 0,
    holiday_night_minutes: 0,
    holiday_night_overtime_minutes: 0,
    total_minutes: totalMinutes,
    is_holiday: false,
    is_confirmed: false,
    is_manual: false,
    late_minutes: lateMinutes,
    early_leave_minutes: earlyLeaveMinutes,
    note: null,
  };
}

async function main() {
  console.log('=== 근태 데이터 리셋 시작 ===');

  // 1. 기존 데이터 전부 삭제
  console.log('기존 데이터 삭제 중...');
  await pool.query('DELETE FROM attendance_segments');
  await pool.query('DELETE FROM salary_attendance_data');
  await pool.query('DELETE FROM attendances');
  console.log('  attendance_segments, salary_attendance_data, attendances 모두 삭제 완료');

  // 2. 2026년 1~2월 근무일 생성
  const records = [];

  for (let month = 1; month <= 2; month++) {
    const daysInMonth = month === 1 ? 31 : 28;
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dateObj = new Date(Date.UTC(2026, month - 1, day));

      if (!isWorkDay(dateObj)) continue;

      for (const emp of EMPLOYEES) {
        const rec = generateAttendance(emp.id, emp.name, emp.type, dateStr);
        if (rec) records.push(rec);
      }
    }
  }

  console.log(`생성할 근태 레코드: ${records.length}개`);

  // 3. 일괄 INSERT
  for (const r of records) {
    await pool.query(`
      INSERT INTO attendances (
        id, company_id, user_id, date,
        check_in_time, check_out_time, status,
        regular_minutes, overtime_minutes, night_minutes,
        night_overtime_minutes, holiday_minutes, holiday_overtime_minutes,
        holiday_night_minutes, holiday_night_overtime_minutes,
        total_minutes, is_holiday, is_confirmed,
        late_minutes, early_leave_minutes, note,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7,
        $8, $9, $10,
        $11, $12, $13,
        $14, $15,
        $16, $17, $18,
        $19, $20, $21,
        NOW(), NOW()
      )
    `, [
      r.id, r.company_id, r.user_id, r.date,
      r.check_in_time, r.check_out_time, r.status,
      r.regular_minutes, r.overtime_minutes, r.night_minutes,
      r.night_overtime_minutes, r.holiday_minutes, r.holiday_overtime_minutes,
      r.holiday_night_minutes, r.holiday_night_overtime_minutes,
      r.total_minutes, r.is_holiday, r.is_confirmed,
      r.late_minutes, r.early_leave_minutes, r.note,
    ]);
  }

  console.log('근태 레코드 INSERT 완료');

  // 4. 통계 출력
  const stats = await pool.query(`
    SELECT u.name, u.employee_number,
      COUNT(*) as total_days,
      SUM(CASE WHEN a.status = 'ON_TIME' THEN 1 ELSE 0 END) as on_time,
      SUM(CASE WHEN a.status = 'LATE' THEN 1 ELSE 0 END) as late,
      SUM(CASE WHEN a.status = 'EARLY_LEAVE' THEN 1 ELSE 0 END) as early_leave
    FROM attendances a
    JOIN users u ON a.user_id = u.id
    WHERE a.deleted_at IS NULL
    GROUP BY u.name, u.employee_number
    ORDER BY u.name
  `);
  console.log('\n=== 직원별 근태 통계 (2026-01 ~ 2026-02) ===');
  stats.rows.forEach(r => {
    console.log(`  ${r.name} (${r.employee_number}): ${r.total_days}일 출근 (정시: ${r.on_time}, 지각: ${r.late}, 조퇴: ${r.early_leave})`);
  });

  const byMonth = await pool.query(`
    SELECT TO_CHAR(date, 'YYYY-MM') as month, COUNT(*) as count
    FROM attendances WHERE deleted_at IS NULL
    GROUP BY TO_CHAR(date, 'YYYY-MM') ORDER BY month
  `);
  console.log('\n=== 월별 건수 ===');
  byMonth.rows.forEach(r => console.log(`  ${r.month}: ${r.count}건`));

  // 결근 대상 날짜 확인
  console.log('\n=== 누락(결근 예상) 날짜 ===');
  console.log('  김영수: 2026-01-15 (병가)');
  console.log('  박지민: 2026-02-25 (경조사)');
  console.log('  이서연: 2026-02-10 이후 (휴직)');
  console.log('  홍파트: 랜덤 결근 (시급제)');

  await pool.end();
  console.log('\n완료!');
}

main().catch(e => { console.error(e); process.exit(1); });

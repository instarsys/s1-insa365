/**
 * 50명 급여 일괄 계산 벤치마크 - DB 직접 접근 버전
 *
 * 1. DB에서 직원 확인 (50명 있어야 함)
 * 2. 2026-05 근태 + SalaryAttendanceData를 DB에 직접 삽입
 * 3. API로 급여 계산 시간 측정
 */

const BASE = 'http://localhost:3001';
const YEAR = 2026;
const MONTH = 5;

let cookies = '';

async function api(method, path, body) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookies ? { Cookie: cookies } : {}),
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const setCookies = res.headers.getSetCookie?.() || [];
  if (setCookies.length > 0) {
    cookies = setCookies.map(c => c.split(';')[0]).join('; ');
  }
  const text = await res.text();
  try { return { status: res.status, data: JSON.parse(text) }; }
  catch { return { status: res.status, data: text }; }
}

async function main() {
  console.log('=== 50명 급여 일괄 계산 벤치마크 (DB 직접 접근) ===\n');

  // 1. 로그인
  console.log('[1] 로그인...');
  const loginRes = await api('POST', '/api/auth/login', {
    email: 'admin@test-company.com',
    password: 'admin123!',
  });
  if (loginRes.status !== 200) {
    console.error('로그인 실패:', loginRes.data);
    process.exit(1);
  }
  const user = loginRes.data.user;
  console.log(`  ${user.name} (${user.role})`);
  const companyId = user.companyId;

  // 2. DB 직접 접근 - pg 사용
  console.log('\n[2] DB 직접 접근으로 데이터 준비...');
  const pg = await import('pg');
  const pool = new pg.default.Pool({
    connectionString: 'postgresql://insa365:insa365dev@localhost:5438/insa365',
  });

  // Get active employees
  const empResult = await pool.query(`
    SELECT id, name, employee_number, salary_type
    FROM users
    WHERE company_id = $1 AND employee_status = 'ACTIVE' AND deleted_at IS NULL
    ORDER BY employee_number
  `, [companyId]);
  console.log(`  활성 직원: ${empResult.rows.length}명`);

  if (empResult.rows.length < 50) {
    console.error(`  직원이 ${empResult.rows.length}명뿐입니다. 50명이 필요합니다.`);
    console.error('  먼저 benchmark-payroll.mjs를 실행하여 직원을 생성하세요.');
    await pool.end();
    process.exit(1);
  }

  const employees = empResult.rows;
  const empIds = employees.map(e => e.id);

  // 3. 기존 급여/근태 데이터 정리
  console.log('\n[3] 2026-05 기존 데이터 정리...');

  // Delete existing salary calculations
  const delCalc = await pool.query(`
    DELETE FROM salary_calculations
    WHERE company_id = $1 AND year = $2 AND month = $3
  `, [companyId, YEAR, MONTH]);
  console.log(`  급여 계산 삭제: ${delCalc.rowCount}건`);

  // Delete existing salary attendance data
  const delSad = await pool.query(`
    DELETE FROM salary_attendance_data
    WHERE company_id = $1 AND year = $2 AND month = $3
  `, [companyId, YEAR, MONTH]);
  console.log(`  근태 스냅샷 삭제: ${delSad.rowCount}건`);

  // Delete existing attendances for May 2026
  const startDate = new Date(YEAR, MONTH - 1, 1);
  const endDate = new Date(YEAR, MONTH, 0);
  const delAtt = await pool.query(`
    DELETE FROM attendance_segments
    WHERE company_id = $1 AND attendance_id IN (
      SELECT id FROM attendances
      WHERE company_id = $1 AND date >= $2 AND date <= $3
    )
  `, [companyId, startDate, endDate]);
  console.log(`  근태 세그먼트 삭제: ${delAtt.rowCount}건`);

  const delAtt2 = await pool.query(`
    DELETE FROM attendances
    WHERE company_id = $1 AND date >= $2 AND date <= $3
  `, [companyId, startDate, endDate]);
  console.log(`  근태 삭제: ${delAtt2.rowCount}건`);

  // 4. 근태 데이터 대량 삽입
  console.log('\n[4] 2026-05 근태 데이터 생성...');
  const workdays = [];
  const daysInMonth = new Date(YEAR, MONTH, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(YEAR, MONTH - 1, d);
    const dow = date.getDay();
    if (dow >= 1 && dow <= 5) workdays.push(date);
  }
  console.log(`  평일 수: ${workdays.length}일`);
  console.log(`  총 근태 레코드: ${empIds.length} × ${workdays.length} = ${empIds.length * workdays.length}건`);

  const insertStart = Date.now();

  // Build bulk insert values for attendances
  let attendanceValues = [];
  let paramIdx = 1;
  let params = [];

  for (const empId of empIds) {
    for (const date of workdays) {
      const checkIn = new Date(date);
      checkIn.setHours(0, 0, 0, 0); // 09:00 KST = 00:00 UTC
      const checkOut = new Date(date);
      checkOut.setHours(9, 0, 0, 0); // 18:00 KST = 09:00 UTC

      attendanceValues.push(`(gen_random_uuid(), $${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, $${paramIdx + 3}, $${paramIdx + 4}, 'ON_TIME', 480, 0, 0, 0, 0, 0, 0, 0, 0, 0, 480, false, true, NOW(), NOW())`);
      params.push(companyId, empId, date, checkIn, checkOut);
      paramIdx += 5;

      // Execute in batches of 200 records
      if (attendanceValues.length >= 200) {
        const sql = `INSERT INTO attendances (id, company_id, user_id, date, check_in_time, check_out_time, status, regular_minutes, overtime_minutes, night_minutes, night_overtime_minutes, holiday_minutes, holiday_overtime_minutes, holiday_night_minutes, holiday_night_overtime_minutes, late_minutes, early_leave_minutes, total_minutes, is_holiday, is_confirmed, created_at, updated_at) VALUES ${attendanceValues.join(', ')} ON CONFLICT (user_id, date) DO UPDATE SET check_in_time = EXCLUDED.check_in_time, check_out_time = EXCLUDED.check_out_time, regular_minutes = EXCLUDED.regular_minutes, total_minutes = EXCLUDED.total_minutes, is_confirmed = true, updated_at = NOW()`;
        await pool.query(sql, params);
        attendanceValues = [];
        params = [];
        paramIdx = 1;
      }
    }
  }

  // Insert remaining
  if (attendanceValues.length > 0) {
    const sql = `INSERT INTO attendances (id, company_id, user_id, date, check_in_time, check_out_time, status, regular_minutes, overtime_minutes, night_minutes, night_overtime_minutes, holiday_minutes, holiday_overtime_minutes, holiday_night_minutes, holiday_night_overtime_minutes, late_minutes, early_leave_minutes, total_minutes, is_holiday, is_confirmed, created_at, updated_at) VALUES ${attendanceValues.join(', ')} ON CONFLICT (user_id, date) DO UPDATE SET check_in_time = EXCLUDED.check_in_time, check_out_time = EXCLUDED.check_out_time, regular_minutes = EXCLUDED.regular_minutes, total_minutes = EXCLUDED.total_minutes, is_confirmed = true, updated_at = NOW()`;
    await pool.query(sql, params);
  }

  const insertTime = ((Date.now() - insertStart) / 1000).toFixed(1);
  console.log(`  근태 삽입 완료 (${insertTime}s)`);

  // 5. SalaryAttendanceData 삽입
  console.log('\n[5] 근태 스냅샷 (SalaryAttendanceData) 생성...');
  const scheduledWorkDays = workdays.length;
  const now = new Date();
  const adminId = user.id;

  // Insert one by one for clarity
  for (const empId of empIds) {
    await pool.query(`
      INSERT INTO salary_attendance_data
        (id, company_id, user_id, year, month, work_days, actual_work_days,
         absent_days, late_days, early_leave_days, leave_days,
         total_regular_minutes, total_overtime_minutes, total_night_minutes,
         total_night_overtime_minutes, total_holiday_minutes, total_holiday_overtime_minutes,
         total_holiday_night_minutes, total_holiday_night_overtime_minutes,
         total_late_minutes, total_early_leave_minutes,
         confirmed_at, confirmed_by, version, created_at)
      VALUES
        (gen_random_uuid(), $1, $2, $3, $4, $5, $5,
         0, 0, 0, 0,
         $6, 0, 0,
         0, 0, 0,
         0, 0,
         0, 0,
         $7, $8, 1, NOW())
      ON CONFLICT (company_id, user_id, year, month, version)
      DO UPDATE SET actual_work_days = EXCLUDED.actual_work_days,
                    total_regular_minutes = EXCLUDED.total_regular_minutes,
                    confirmed_at = NOW()
    `, [companyId, empId, YEAR, MONTH, scheduledWorkDays, scheduledWorkDays * 480, now, adminId]);
  }

  // Verify data
  const attCount = await pool.query(`
    SELECT COUNT(*) FROM attendances
    WHERE company_id = $1 AND date >= $2 AND date <= $3 AND is_confirmed = true
  `, [companyId, startDate, endDate]);
  const sadCount = await pool.query(`
    SELECT COUNT(*) FROM salary_attendance_data
    WHERE company_id = $1 AND year = $2 AND month = $3
  `, [companyId, YEAR, MONTH]);
  console.log(`  확정 근태: ${attCount.rows[0].count}건, 스냅샷: ${sadCount.rows[0].count}건`);

  await pool.end();

  // 6. 급여 일괄 계산 시간 측정
  console.log('\n[6] 급여 일괄 계산 시작...');
  console.log(`  대상: ${empIds.length}명, 기간: ${YEAR}-${String(MONTH).padStart(2, '0')}`);

  const calcStart = Date.now();
  const calcRes = await api('POST', '/api/payroll/calculate', {
    year: YEAR,
    month: MONTH,
  });
  const calcEnd = Date.now();
  const calcDuration = calcEnd - calcStart;
  const calcSeconds = (calcDuration / 1000).toFixed(2);

  // 7. 결과 보고
  console.log('\n' + '='.repeat(60));
  console.log('  급여 일괄 계산 벤치마크 결과');
  console.log('='.repeat(60));

  if (calcRes.status === 200) {
    const result = calcRes.data.data || calcRes.data;
    const calculatedCount = result?.calculatedCount || result?.items?.length || 'N/A';

    console.log(`  대상 직원 수: ${empIds.length}명`);
    console.log(`  계산 완료:    ${calculatedCount}명`);
    console.log(`  소요 시간:    ${calcDuration}ms (${calcSeconds}s)`);
    console.log(`  목표:         10,000ms (10초) 이내`);
    console.log('');

    const passed = calcDuration <= 10000;
    if (passed) {
      console.log(`  >>> 소요시간 ${calcSeconds}s -- PASS <<<`);
    } else {
      console.log(`  >>> 소요시간 ${calcSeconds}s -- FAIL (10초 초과) <<<`);
    }

    // Sample results
    if (result?.items && result.items.length > 0) {
      console.log(`\n  [샘플 급여 결과 (처음 5명)]`);
      result.items.slice(0, 5).forEach((item, i) => {
        const name = item.userName || item.user?.name || 'N/A';
        const tp = Number(item.totalPay || 0).toLocaleString('ko-KR');
        const td = Number(item.totalDeduction || 0).toLocaleString('ko-KR');
        const np = Number(item.netPay || 0).toLocaleString('ko-KR');
        console.log(`    ${i + 1}. ${name}: 총지급 ${tp}원 / 총공제 ${td}원 / 실수령 ${np}원`);
      });

      // Summary
      const totalPay = result.items.reduce((s, i) => s + Number(i.totalPay || 0), 0);
      const totalDed = result.items.reduce((s, i) => s + Number(i.totalDeduction || 0), 0);
      const totalNet = result.items.reduce((s, i) => s + Number(i.netPay || 0), 0);
      console.log(`\n  [전체 합계]`);
      console.log(`    총지급액: ${totalPay.toLocaleString('ko-KR')}원`);
      console.log(`    총공제액: ${totalDed.toLocaleString('ko-KR')}원`);
      console.log(`    총실수령: ${totalNet.toLocaleString('ko-KR')}원`);
    }
  } else {
    console.log(`  계산 실패!`);
    console.log(`  Status: ${calcRes.status}`);
    console.log(`  Message: ${JSON.stringify(calcRes.data?.message || calcRes.data).substring(0, 200)}`);
    console.log(`  소요 시간: ${calcDuration}ms (${calcSeconds}s)`);
    console.log(`  >>> FAIL (계산 오류) <<<`);
  }

  console.log('\n' + '='.repeat(60));
}

main().catch(err => {
  console.error('벤치마크 오류:', err);
  process.exit(1);
});

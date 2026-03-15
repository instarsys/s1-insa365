/**
 * 50명 급여 일괄 계산 벤치마크 스크립트
 *
 * 순서:
 * 1. 로그인
 * 2. 직원 수 확인, 50명 미만이면 추가 생성
 * 3. 2026-05 기존 급여 정리 (있으면 취소/삭제)
 * 4. 2026-05 근태 데이터 생성 (21 평일 × 50명)
 * 5. 근태 확정
 * 6. 급여 일괄 계산 시간 측정
 * 7. 결과 보고
 */

const BASE = 'http://localhost:3001';
const YEAR = 2026;
const MONTH = 5;

// Department IDs for employee creation
const DEPT_IDS = [
  '240d8e22-f85f-43ca-b200-bf96bff17bdd', // 경영지원팀
  '0cc57260-59cc-4d6a-83fe-734745604e3f', // 개발팀
  'c2a8c3c4-6467-41aa-9fef-18343639f64e', // 영업팀
  '18beb3f2-a243-4432-aee6-4e3436fecbc5', // 마케팅팀
  'e771bd12-2204-4743-915d-3c2757fb07af', // 인사팀
];

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

  // Extract cookies from Set-Cookie
  const setCookies = res.headers.getSetCookie?.() || [];
  if (setCookies.length > 0) {
    const cookieParts = setCookies.map(c => c.split(';')[0]);
    cookies = cookieParts.join('; ');
  }

  const text = await res.text();
  try {
    return { status: res.status, data: JSON.parse(text) };
  } catch {
    return { status: res.status, data: text };
  }
}

// Get workdays in May 2026 (Mon-Fri)
function getWorkdays(year, month) {
  const days = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);
    const dow = date.getDay();
    if (dow >= 1 && dow <= 5) {
      days.push(date.toISOString().split('T')[0]);
    }
  }
  return days;
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('=== 50명 급여 일괄 계산 벤치마크 ===\n');

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
  console.log(`  로그인 성공: ${loginRes.data.user.name} (${loginRes.data.user.role})`);

  // 2. 직원 수 확인
  console.log('\n[2] 직원 수 확인...');
  const empRes = await api('GET', '/api/employees?limit=200');
  let employees = empRes.data.data?.items || empRes.data.items || [];
  const activeEmployees = employees.filter(e => e.employeeStatus === 'ACTIVE');
  console.log(`  현재 활성 직원: ${activeEmployees.length}명`);

  // 50명 미만이면 추가 생성
  const TARGET = 50;
  if (activeEmployees.length < TARGET) {
    const needed = TARGET - activeEmployees.length;
    console.log(`  ${needed}명 추가 생성 필요...`);

    const lastNames = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '류', '홍'];
    const firstNames = ['민수', '수진', '영호', '지영', '성호', '미란', '태영', '은정', '준혁', '소연', '현우', '지혜', '동훈', '유진', '상우', '혜진', '재민', '아름', '우진', '하늘', '건우', '서현', '민재', '예진', '시우', '다은', '지훈', '수빈', '현준', '나연', '도윤', '채원', '승현', '유나', '민석', '지원', '한결', '서윤', '준서', '하은'];

    let created = 0;
    const BATCH_SIZE = 10;
    for (let i = 0; i < needed; i++) {
      const lname = lastNames[i % lastNames.length];
      const fname = firstNames[i % firstNames.length];
      const name = lname + fname;
      const email = `bench${String(i + 1).padStart(3, '0')}@test-company.com`;
      const deptId = DEPT_IDS[i % DEPT_IDS.length];

      const createRes = await api('POST', '/api/employees', {
        name,
        email,
        phone: `010-0000-${String(1000 + i).slice(-4)}`,
        role: 'EMPLOYEE',
        departmentId: deptId,
        joinDate: '2025-01-01',
        baseSalary: 3000000 + (i * 100000),
        salaryType: 'MONTHLY',
      });

      if (createRes.status === 201 || createRes.status === 200) {
        created++;
      } else if (createRes.status === 409) {
        // Already exists, that's fine
        created++;
      } else {
        console.error(`  직원 생성 실패 (${name}):`, createRes.data?.message || createRes.status);
      }

      // Rate limiting: pause every BATCH_SIZE
      if ((i + 1) % BATCH_SIZE === 0 && i + 1 < needed) {
        process.stdout.write(`  생성 진행: ${i + 1}/${needed}\r`);
        await sleep(500);
      }
    }
    console.log(`  ${created}명 생성 완료`);

    // Re-fetch employees
    const empRes2 = await api('GET', '/api/employees?limit=200');
    employees = empRes2.data.data?.items || empRes2.data.items || [];
    console.log(`  현재 전체 직원: ${employees.length}명`);
  }

  const activeIds = employees.filter(e => e.employeeStatus === 'ACTIVE').map(e => e.id);
  console.log(`  활성 직원: ${activeIds.length}명`);

  // 3. 기존 급여 정리
  console.log('\n[3] 2026-05 기존 급여 정리...');
  const existingCalc = await api('GET', `/api/payroll/calculate?year=${YEAR}&month=${MONTH}`);
  if (existingCalc.status === 200) {
    const calcData = existingCalc.data.data || existingCalc.data;
    const items = calcData?.items || [];
    if (items.length > 0) {
      const hasConfirmed = items.some(i => i.status === 'CONFIRMED');
      if (hasConfirmed) {
        console.log('  확정 급여 취소 중...');
        await api('POST', '/api/payroll/cancel', { year: YEAR, month: MONTH });
      }
      console.log(`  기존 ${items.length}건 급여 존재 (DRAFT 상태 → 재계산 덮어쓰기)`);
    } else {
      console.log('  기존 급여 없음');
    }
  }

  // 4. 근태 데이터 생성
  console.log('\n[4] 2026-05 근태 데이터 생성...');
  const workdays = getWorkdays(YEAR, MONTH);
  console.log(`  평일 수: ${workdays.length}일`);
  console.log(`  총 근태 레코드: ${activeIds.length} × ${workdays.length} = ${activeIds.length * workdays.length}건`);

  let attendanceCreated = 0;
  let attendanceErrors = 0;
  const totalRecords = activeIds.length * workdays.length;
  const startAttendance = Date.now();

  // Create attendance records in batches
  const CONCURRENT = 5;
  for (let empIdx = 0; empIdx < activeIds.length; empIdx++) {
    const userId = activeIds[empIdx];

    // Process workdays in concurrent batches
    for (let dayIdx = 0; dayIdx < workdays.length; dayIdx += CONCURRENT) {
      const batch = workdays.slice(dayIdx, dayIdx + CONCURRENT);
      const promises = batch.map(dateStr => {
        const checkIn = `${dateStr}T09:00:00+09:00`;
        const checkOut = `${dateStr}T18:00:00+09:00`;
        return api('POST', '/api/attendance/manual', {
          userId,
          date: dateStr,
          checkInTime: checkIn,
          checkOutTime: checkOut,
        });
      });

      const results = await Promise.all(promises);
      for (const r of results) {
        if (r.status === 201 || r.status === 200) {
          attendanceCreated++;
        } else if (r.status === 429) {
          // Rate limited - wait and retry
          console.log('\n  Rate limited! 65초 대기...');
          await sleep(65000);
          attendanceErrors++;
        } else {
          attendanceErrors++;
        }
      }

      const progress = attendanceCreated + attendanceErrors;
      if (progress % 50 === 0 || progress === totalRecords) {
        process.stdout.write(`  근태 진행: ${progress}/${totalRecords} (성공: ${attendanceCreated}, 실패: ${attendanceErrors})\r`);
      }
    }

    // Small delay between employees to avoid rate limiting
    if ((empIdx + 1) % 5 === 0) {
      await sleep(200);
    }
  }

  const attendanceTime = ((Date.now() - startAttendance) / 1000).toFixed(1);
  console.log(`\n  근태 생성 완료: ${attendanceCreated}건 (${attendanceTime}s, 실패: ${attendanceErrors})`);

  // 5. 근태 확정
  console.log('\n[5] 2026-05 근태 확정...');
  const confirmStart = Date.now();
  const confirmRes = await api('POST', '/api/attendance/confirm', {
    year: YEAR,
    month: MONTH,
    userIds: activeIds,
  });
  const confirmTime = ((Date.now() - confirmStart) / 1000).toFixed(1);
  if (confirmRes.status === 200) {
    const confirmData = confirmRes.data.data || confirmRes.data;
    console.log(`  확정 완료: ${confirmData?.confirmedCount || 'N/A'}명 (${confirmTime}s)`);
  } else {
    console.error('  확정 실패:', confirmRes.data?.message || confirmRes.status);
  }

  // 6. 급여 일괄 계산 시간 측정
  console.log('\n[6] 급여 일괄 계산 시작...');
  console.log(`  대상: ${activeIds.length}명, 기간: ${YEAR}-${String(MONTH).padStart(2, '0')}`);

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
  console.log('급여 일괄 계산 벤치마크 결과');
  console.log('='.repeat(60));

  if (calcRes.status === 200) {
    const result = calcRes.data.data || calcRes.data;
    const calculatedCount = result?.calculatedCount || result?.items?.length || 'N/A';

    console.log(`  대상 직원 수: ${activeIds.length}명`);
    console.log(`  계산 완료: ${calculatedCount}명`);
    console.log(`  소요 시간: ${calcDuration}ms (${calcSeconds}s)`);
    console.log(`  목표: 10초 이내`);
    console.log('');

    const passed = calcDuration <= 10000;
    if (passed) {
      console.log(`  >>> 소요시간 ${calcSeconds}s -- PASS <<<`);
    } else {
      console.log(`  >>> 소요시간 ${calcSeconds}s -- FAIL (10초 초과) <<<`);
    }

    // Print some sample calculations
    if (result?.items && result.items.length > 0) {
      console.log('\n  [샘플 급여 결과 (처음 5명)]');
      result.items.slice(0, 5).forEach((item, i) => {
        const name = item.userName || item.user?.name || 'N/A';
        const totalPay = item.totalPay?.toLocaleString?.() || item.totalPay;
        const totalDeduction = item.totalDeduction?.toLocaleString?.() || item.totalDeduction;
        const netPay = item.netPay?.toLocaleString?.() || item.netPay;
        console.log(`    ${i + 1}. ${name}: 총지급 ${totalPay} / 총공제 ${totalDeduction} / 실수령 ${netPay}`);
      });
    }
  } else {
    console.log(`  계산 실패!`);
    console.log(`  Status: ${calcRes.status}`);
    console.log(`  Message: ${JSON.stringify(calcRes.data?.message || calcRes.data)}`);
    console.log(`  소요 시간: ${calcDuration}ms (${calcSeconds}s)`);
    console.log(`  >>> FAIL (계산 오류) <<<`);
  }

  console.log('\n' + '='.repeat(60));
}

main().catch(err => {
  console.error('벤치마크 스크립트 오류:', err);
  process.exit(1);
});

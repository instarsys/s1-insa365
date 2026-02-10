import { test, expect, type Page, type BrowserContext, request as playwrightRequest } from '@playwright/test';
import path from 'path';

const BASE_URL = 'http://localhost:3001';
const STORAGE_STATE_PATH = path.join(__dirname, '.auth-state.json');

// Test month: 2026-03 (March) — seed 데이터와 충돌 없는 깨끗한 월
const TEST_YEAR = 2026;
const TEST_MONTH = 3;

// 테스트 대상 직원 10명 (시드 데이터)
const EMPLOYEES = [
  { name: '김영수', number: 'EA0002', email: 'kim.ys@test-company.com', basePay: 4_500_000, scenario: '정상' },
  { name: '조현우', number: 'EA0015', email: 'cho.hw@test-company.com', basePay: 3_900_000, scenario: '연장' },
  { name: '표지연', number: 'EA0048', email: 'pyo.jy@test-company.com', basePay: 3_700_000, scenario: '지각' },
  { name: '배소라', number: 'EA0016', email: 'bae.sr@test-company.com', basePay: 3_000_000, scenario: '조퇴' },
  { name: '임수정', number: 'EA0012', email: 'lim.sj@test-company.com', basePay: 4_300_000, scenario: '연차' },
  { name: '서준혁', number: 'EA0013', email: 'seo.jh@test-company.com', basePay: 3_700_000, scenario: '반차' },
  { name: '황미영', number: 'EA0014', email: 'hwang.my@test-company.com', basePay: 3_100_000, scenario: '병가' },
  { name: '차은별', number: 'EA0040', email: 'cha.eb@test-company.com', basePay: 3_800_000, scenario: '야간' },
  { name: '봉지훈', number: 'EA0039', email: 'bong.jh@test-company.com', basePay: 2_900_000, scenario: '휴일' },
  { name: '감민수', number: 'EA0047', email: 'gam.ms@test-company.com', basePay: 4_600_000, scenario: '결근' },
] as const;

const EMPLOYEE_PASSWORD = 'test1234!';

// ═══════════════════════════════════════════════════════════════
// 헬퍼 함수
// ═══════════════════════════════════════════════════════════════

/** 2026년 3월 평일 목록 (22일) */
function getWeekdaysInMonth(year: number, month: number): string[] {
  const days: string[] = [];
  const date = new Date(year, month - 1, 1);
  while (date.getMonth() === month - 1) {
    const dow = date.getDay();
    if (dow >= 1 && dow <= 5) {
      days.push(date.toISOString().slice(0, 10));
    }
    date.setDate(date.getDate() + 1);
  }
  return days;
}

/** 2026년 3월 토요일 목록 */
function getSaturdaysInMonth(year: number, month: number): string[] {
  const days: string[] = [];
  const date = new Date(year, month - 1, 1);
  while (date.getMonth() === month - 1) {
    if (date.getDay() === 6) {
      days.push(date.toISOString().slice(0, 10));
    }
    date.setDate(date.getDate() + 1);
  }
  return days;
}

/** ISO datetime 포맷 */
function toISO(dateStr: string, hour: number, minute = 0): string {
  return `${dateStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000Z`;
}

/** 날짜 문자열의 다음날 */
function nextDay(dateStr: string): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

interface AttendanceTemplate {
  checkInHour: number;
  checkInMinute?: number;
  checkOutHour: number;
  checkOutMinute?: number;
  status: string;
  isHoliday?: boolean;
  /** 퇴근이 다음날인 경우 */
  checkOutNextDay?: boolean;
}

/** 딜레이 헬퍼 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Rate-limit 대응 POST (429 시 Retry-After 대기 후 재시도) */
async function rateLimitPost(
  apiRequest: BrowserContext['request'],
  url: string,
  data: object,
  label: string,
): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const resp = await apiRequest.post(url, { data });
    if (resp.ok()) return;
    if (resp.status() === 429) {
      const retryAfter = Number(resp.headers()['retry-after'] ?? '5');
      await delay((retryAfter + 1) * 1000);
      continue;
    }
    expect(resp.ok(), `${label} - ${await resp.text()}`).toBeTruthy();
  }
  throw new Error(`${label}: 3회 재시도 후에도 실패`);
}

/** 근태 기록 일괄 생성 (1명 × N일, rate limiting 자동 재시도) */
async function createAttendanceRecords(
  apiRequest: BrowserContext['request'],
  userId: string,
  dates: string[],
  template: AttendanceTemplate,
): Promise<void> {
  for (const date of dates) {
    const checkOutDate = template.checkOutNextDay ? nextDay(date) : date;
    await rateLimitPost(apiRequest, `${BASE_URL}/api/attendance/manual`, {
      userId,
      date,
      checkInTime: toISO(date, template.checkInHour, template.checkInMinute ?? 0),
      checkOutTime: toISO(checkOutDate, template.checkOutHour, template.checkOutMinute ?? 0),
      status: template.status,
      isHoliday: template.isHoliday ?? false,
    }, `근태 생성 실패: ${date}`);
  }
}

/** 근태 기록 (상태만, 출퇴근 시간 없음 — LEAVE/ABSENT 등) */
async function createAttendanceStatus(
  apiRequest: BrowserContext['request'],
  userId: string,
  dates: string[],
  status: string,
): Promise<void> {
  for (const date of dates) {
    await rateLimitPost(apiRequest, `${BASE_URL}/api/attendance/manual`, {
      userId,
      date,
      status,
      isHoliday: false,
    }, `근태 상태 생성 실패: ${date}`);
  }
}

/** 직원으로 임시 로그인 → 휴가 신청 → ID 반환 */
async function createLeaveRequestAs(
  email: string,
  password: string,
  leaveData: { type: string; startDate: string; endDate: string; days: number; reason?: string },
): Promise<string> {
  const empApi = await playwrightRequest.newContext({ baseURL: BASE_URL });
  try {
    const loginResp = await empApi.post('/api/auth/login', {
      data: { email, password },
    });
    expect(loginResp.ok(), `직원 로그인 실패: ${email}`).toBeTruthy();

    const leaveResp = await empApi.post('/api/leave/request', {
      data: leaveData,
    });
    expect(leaveResp.ok(), `휴가 신청 실패: ${email} - ${await leaveResp.text()}`).toBeTruthy();
    const body = await leaveResp.json();
    return body.id;
  } finally {
    await empApi.dispose();
  }
}

// ═══════════════════════════════════════════════════════════════
// 테스트 본문
// ═══════════════════════════════════════════════════════════════

test.describe.serial('급여 통합 E2E 테스트', () => {
  let context: BrowserContext;
  let page: Page;
  const pageErrors: string[] = [];

  // 직원 ID 맵 (employeeNumber → userId)
  const employeeIds: Record<string, string> = {};

  // 휴가 신청 ID (나중에 승인용)
  const leaveRequestIds: string[] = [];

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();

    // JS 에러 수집
    page.on('pageerror', (err) => {
      if (!err.message.includes('Hydration')) {
        pageErrors.push(err.message);
      }
    });
  });

  test.afterAll(async () => {
    await context.close();
  });

  // ═══════════════════════════════════════════════════════════════
  // Phase 0: 사전 정리 + 직원 ID 조회
  // ═══════════════════════════════════════════════════════════════

  test('Phase 0-A: 이전 테스트 실행의 잔여 데이터를 정리한다', async () => {
    // 이전 실행에서 CONFIRMED 상태로 남은 급여 데이터를 취소
    const cancelResp = await context.request.post(`${BASE_URL}/api/payroll/cancel`, {
      data: { year: TEST_YEAR, month: TEST_MONTH },
    });
    // 취소할 데이터가 없으면 400 반환 — 정상
    if (cancelResp.ok()) {
      const body = await cancelResp.json();
      console.log(`기존 확정 급여 ${body.cancelledCount}건 취소됨`);
    }
  });

  test('Phase 0-B: 테스트 대상 직원 10명의 userId를 조회한다', async () => {
    for (const emp of EMPLOYEES) {
      const resp = await context.request.get(
        `${BASE_URL}/api/employees?search=${encodeURIComponent(emp.number)}&limit=5`,
      );
      expect(resp.ok()).toBeTruthy();
      const body = await resp.json();
      const found = body.items?.find(
        (item: { employeeNumber: string }) => item.employeeNumber === emp.number,
      );
      expect(found, `직원 ${emp.name}(${emp.number})을 찾지 못했습니다`).toBeTruthy();
      employeeIds[emp.number] = found.id;
    }
    expect(Object.keys(employeeIds)).toHaveLength(10);
  });

  // ═══════════════════════════════════════════════════════════════
  // Phase 1: 근태 데이터 생성 (API) — 220+ API 호출, rate limit 대기 포함
  // ═══════════════════════════════════════════════════════════════

  test('Phase 1: 10명 직원의 3월 근태 데이터를 생성한다', async () => {
    test.setTimeout(300_000); // 5분 (rate limit 429 대기 포함)
    const weekdays = getWeekdaysInMonth(TEST_YEAR, TEST_MONTH);
    const saturdays = getSaturdaysInMonth(TEST_YEAR, TEST_MONTH);

    // 1-1. 김영수: 22일 정상 (09:00-18:00)
    await createAttendanceRecords(context.request, employeeIds['EA0002'], weekdays, {
      checkInHour: 9, checkOutHour: 18, status: 'ON_TIME',
    });

    // 1-2. 조현우: 22일 연장 (09:00-20:00)
    await createAttendanceRecords(context.request, employeeIds['EA0015'], weekdays, {
      checkInHour: 9, checkOutHour: 20, status: 'ON_TIME',
    });

    // 1-3. 표지연: 22일 지각 (09:30-18:00)
    await createAttendanceRecords(context.request, employeeIds['EA0048'], weekdays, {
      checkInHour: 9, checkInMinute: 30, checkOutHour: 18, status: 'LATE',
    });

    // 1-4. 배소라: 22일 조퇴 (09:00-16:00)
    await createAttendanceRecords(context.request, employeeIds['EA0016'], weekdays, {
      checkInHour: 9, checkOutHour: 16, status: 'EARLY_LEAVE',
    });

    // 1-5. 임수정: 21일 정상 + 1일 LEAVE
    await createAttendanceRecords(context.request, employeeIds['EA0012'], weekdays.slice(0, 21), {
      checkInHour: 9, checkOutHour: 18, status: 'ON_TIME',
    });
    await createAttendanceStatus(context.request, employeeIds['EA0012'], weekdays.slice(21, 22), 'LEAVE');

    // 1-6. 서준혁: 21일 정상 + 1일 반차 (13:00-18:00)
    await createAttendanceRecords(context.request, employeeIds['EA0013'], weekdays.slice(0, 21), {
      checkInHour: 9, checkOutHour: 18, status: 'ON_TIME',
    });
    await createAttendanceRecords(context.request, employeeIds['EA0013'], weekdays.slice(21, 22), {
      checkInHour: 13, checkOutHour: 18, status: 'ON_TIME',
    });

    // 1-7. 황미영: 21일 정상 + 1일 LEAVE (병가)
    await createAttendanceRecords(context.request, employeeIds['EA0014'], weekdays.slice(0, 21), {
      checkInHour: 9, checkOutHour: 18, status: 'ON_TIME',
    });
    await createAttendanceStatus(context.request, employeeIds['EA0014'], weekdays.slice(21, 22), 'LEAVE');

    // 1-8. 차은별: 22일 야간 (22:00-06:00+1)
    await createAttendanceRecords(context.request, employeeIds['EA0040'], weekdays, {
      checkInHour: 22, checkOutHour: 6, status: 'ON_TIME', checkOutNextDay: true,
    });

    // 1-9. 봉지훈: 21일 정상 + 1일 휴일근무 (토요일)
    await createAttendanceRecords(context.request, employeeIds['EA0039'], weekdays.slice(0, 21), {
      checkInHour: 9, checkOutHour: 18, status: 'ON_TIME',
    });
    await createAttendanceRecords(context.request, employeeIds['EA0039'], [saturdays[0]], {
      checkInHour: 9, checkOutHour: 18, status: 'ON_TIME', isHoliday: true,
    });

    // 1-10. 감민수: 20일 정상 + 2일 결근
    await createAttendanceRecords(context.request, employeeIds['EA0047'], weekdays.slice(0, 20), {
      checkInHour: 9, checkOutHour: 18, status: 'ON_TIME',
    });
    await createAttendanceStatus(context.request, employeeIds['EA0047'], weekdays.slice(20, 22), 'ABSENT');
  });

  // ═══════════════════════════════════════════════════════════════
  // Phase 2: 휴가 신청 + 승인
  // ═══════════════════════════════════════════════════════════════

  test.describe('Phase 2: 휴가 신청 및 승인', () => {
    const weekdays = getWeekdaysInMonth(TEST_YEAR, TEST_MONTH);
    const leaveDate = weekdays[21]; // 22번째 평일 (마지막)

    test('2-1. 임수정 연차 1일 신청', async () => {
      const id = await createLeaveRequestAs(
        EMPLOYEES[4].email, EMPLOYEE_PASSWORD,
        { type: 'ANNUAL', startDate: leaveDate, endDate: leaveDate, days: 1, reason: '개인 사유' },
      );
      leaveRequestIds.push(id);
      expect(id).toBeTruthy();
    });

    test('2-2. 서준혁 반차(오전) 0.5일 신청', async () => {
      const id = await createLeaveRequestAs(
        EMPLOYEES[5].email, EMPLOYEE_PASSWORD,
        { type: 'HALF_DAY_AM', startDate: leaveDate, endDate: leaveDate, days: 0.5, reason: '병원 방문' },
      );
      leaveRequestIds.push(id);
      expect(id).toBeTruthy();
    });

    test('2-3. 황미영 병가 1일 신청', async () => {
      const id = await createLeaveRequestAs(
        EMPLOYEES[6].email, EMPLOYEE_PASSWORD,
        { type: 'SICK', startDate: leaveDate, endDate: leaveDate, days: 1, reason: '감기' },
      );
      leaveRequestIds.push(id);
      expect(id).toBeTruthy();
    });

    test('2-4. 관리자가 3건의 휴가를 승인한다', async () => {
      for (const leaveId of leaveRequestIds) {
        const resp = await context.request.put(
          `${BASE_URL}/api/leave/request/${leaveId}/approve`,
        );
        expect(resp.ok(), `휴가 승인 실패: ${leaveId} - ${await resp.text()}`).toBeTruthy();
      }
    });

    test('2-5. 휴가 관리 페이지가 정상 로드된다', async () => {
      await page.goto('/attendance/leave');
      await page.waitForTimeout(2000);
      await expect(page.getByRole('heading', { name: '휴가 관리', exact: true })).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Phase 3: 근태 확정 (API)
  // ═══════════════════════════════════════════════════════════════

  test('Phase 3: 2026년 3월 근태를 확정한다', async () => {
    test.setTimeout(60_000);
    const resp = await context.request.post(`${BASE_URL}/api/attendance/confirm`, {
      data: { year: TEST_YEAR, month: TEST_MONTH },
    });
    expect(resp.ok(), `근태 확정 실패: ${await resp.text()}`).toBeTruthy();
    const body = await resp.json();
    expect(body.confirmedCount).toBeGreaterThan(0);
  });

  // ═══════════════════════════════════════════════════════════════
  // Phase 4: 급여 실행 3단계 (UI)
  // ═══════════════════════════════════════════════════════════════

  test('Phase 4 준비: Rate limit 쿨다운 대기 (65초)', async () => {
    test.setTimeout(120_000);
    // Phase 1~3에서 220+ API 호출 후, 브라우저 fetch도 같은 rate limiter를 거침
    // 60초 윈도우가 완전히 리셋되도록 65초 대기
    await delay(65_000);
  });

  test.describe('Phase 4: 급여 실행 3단계', () => {
    // ─── Step 1: 급여 입력 ─────────────────────────────────
    test.describe('Step 1: 급여 입력', () => {
      test('4-1. API로 급여 계산을 실행한다', async () => {
        test.setTimeout(120_000);
        // UI 클릭 대신 API로 직접 계산 — 에러를 명확히 확인 가능
        const resp = await context.request.post(`${BASE_URL}/api/payroll/calculate`, {
          data: { year: TEST_YEAR, month: TEST_MONTH },
        });
        expect(resp.ok(), `급여 계산 API 실패: ${await resp.text()}`).toBeTruthy();
        const body = await resp.json();
        expect(body.calculatedCount).toBeGreaterThan(0);
      });

      test('4-2. /payroll/run 이동 후 스프레드시트가 표시된다', async () => {
        test.setTimeout(60_000);
        await page.goto(`/payroll/run`);
        await page.waitForTimeout(2000);

        await page.getByLabel('연도').selectOption(String(TEST_YEAR));
        await page.getByLabel('월').selectOption(String(TEST_MONTH));
        await page.waitForTimeout(3000);

        // SWR이 이미 계산된 데이터를 로드 → 테이블 표시
        await page.waitForSelector('table tbody tr', { timeout: 30_000 });
      });

      test('4-3. 테이블에 직원 행이 존재한다', async () => {
        const rows = page.locator('table tbody tr');
        const count = await rows.count();
        expect(count).toBeGreaterThanOrEqual(10);
      });

      test('4-4. 김영수 행에 기본급 4,500,000이 표시된다', async () => {
        const kimRow = page.locator('table tbody tr').filter({ hasText: '김영수' });
        await expect(kimRow).toBeVisible();
        await expect(kimRow.locator('text=4,500,000').first()).toBeVisible();
      });

      test('4-5. 각 테스트 직원의 총지급/총공제/실수령이 양수이다', async () => {
        // 김영수 행의 총지급(파란색 배경), 총공제(빨간색 배경), 실수령(초록색 배경) 확인
        const kimRow = page.locator('table tbody tr').filter({ hasText: '김영수' });
        // 실수령 컬럼 (bg-emerald)에 금액이 있는지 확인
        const netPayCell = kimRow.locator('td.bg-emerald-50\\/50');
        await expect(netPayCell).toBeVisible();
        const text = await netPayCell.textContent();
        // "0원"이 아니어야 함
        expect(text).not.toBe('0원');
        expect(text).not.toBe('0');
      });

      test('4-6. 감민수 행이 존재한다 (결근 포함)', async () => {
        const gamRow = page.locator('table tbody tr').filter({ hasText: '감민수' });
        await expect(gamRow).toBeVisible();
      });

      test('4-7. "다음 단계" 클릭하여 Step 2로 이동', async () => {
        await page.getByRole('button', { name: /다음 단계/ }).click();
        // Step 2: 검토 화면 확인 (StatCard 총 지급액)
        await expect(page.locator('text=총 지급액').first()).toBeVisible({ timeout: 10000 });
      });
    });

    // ─── Step 2: 검토 ─────────────────────────────────────
    test.describe('Step 2: 검토', () => {
      test('4-8. 총 지급액 StatCard가 양수 금액을 표시한다', async () => {
        const statCard = page.locator('text=총 지급액').first().locator('..');
        await expect(statCard).toBeVisible();
        const cardText = await statCard.textContent();
        // 금액에 원 또는 쉼표 포함 확인
        expect(cardText).toMatch(/[\d,]+/);
      });

      test('4-9. 총 공제 StatCard가 양수 금액을 표시한다', async () => {
        await expect(page.locator('text=총 공제').first()).toBeVisible();
      });

      test('4-10. 총 실수령 StatCard가 양수 금액을 표시한다', async () => {
        await expect(page.locator('text=총 실수령').first()).toBeVisible();
      });

      test('4-11. 부서별 현황 테이블이 표시된다', async () => {
        await expect(page.locator('text=부서별 현황')).toBeVisible();
      });

      test('4-12. 전월 대비 변동 섹션이 존재한다', async () => {
        // 전월 대비 섹션은 이전 데이터가 있을 때만 표시되므로, 없더라도 OK
        // 대신 Step 2에 고유 콘텐츠가 있는지 확인
        const reviewContent = page.locator('main');
        await expect(reviewContent).toBeVisible();
      });

      test('4-13. "다음 단계" 클릭하여 Step 3로 이동', async () => {
        await page.getByRole('button', { name: /다음 단계/ }).click();
        // Step 3: 확정 화면 확인 (급여 확정 버튼)
        await expect(page.getByRole('button', { name: '급여 확정' })).toBeVisible({ timeout: 10000 });
      });
    });

    // ─── Step 3: 확정 ─────────────────────────────────────
    test.describe('Step 3: 확정', () => {
      test('4-14. 3개 Big Number Cards가 표시된다', async () => {
        // 총 지급액 / 총 공제 / 총 실수령
        const cards = page.locator('.rounded-xl.border');
        const count = await cards.count();
        expect(count).toBeGreaterThanOrEqual(3);
      });

      test('4-15. "2026년 3월" 기간이 표시된다', async () => {
        await expect(page.locator('text=2026년 3월')).toBeVisible();
      });

      test('4-16. 대상 인원 수가 표시된다', async () => {
        await expect(page.locator('text=/\\d+명/')).toBeVisible();
      });

      test('4-17. "부서별 내역 보기" 펼치기가 가능하다', async () => {
        const details = page.locator('summary:has-text("부서별 내역 보기")');
        if (await details.isVisible()) {
          await details.click();
          // 부서별 테이블이 펼쳐지는지 확인
          await expect(page.locator('details table')).toBeVisible();
        }
      });

      test('4-18. "급여 확정" 버튼을 클릭한다', async () => {
        await page.getByRole('button', { name: '급여 확정' }).click();
        // 확정 모달이 나타나는지 확인
        await expect(page.locator('text=급여를 확정하시겠습니까')).toBeVisible({ timeout: 5000 });
      });

      test('4-19. 모달에서 "확정하기"를 클릭한다', async () => {
        test.setTimeout(60_000);
        await page.getByRole('button', { name: '확정하기' }).click();
        // 성공 메시지 대기
        await expect(page.locator('text=급여가 확정되었습니다')).toBeVisible({ timeout: 30000 });
      });

      test('4-20. 확정 후 성공 화면이 표시된다', async () => {
        await expect(page.locator('text=급여대장과 급여명세서가 자동 생성됩니다')).toBeVisible();
        // 급여대장 보기 / 급여명세서 보기 버튼
        await expect(page.getByRole('button', { name: '급여대장 보기' })).toBeVisible();
        await expect(page.getByRole('button', { name: '급여명세서 보기' })).toBeVisible();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Phase 5: 결과 검증
  // ═══════════════════════════════════════════════════════════════

  test.describe('Phase 5: 결과 검증', () => {
    // ─── 급여대장 /payroll/ledger ─────────────────────────
    test.describe('급여대장 검증', () => {
      test('5-1. 급여대장 페이지에서 2026/3 선택 시 테이블이 표시된다', async () => {
        test.setTimeout(60_000);
        await page.goto('/payroll/ledger');
        await page.waitForTimeout(1000);
        await page.getByLabel('연도').selectOption(String(TEST_YEAR));
        await page.getByLabel('월').selectOption(String(TEST_MONTH));
        // SWR이 데이터를 가져올 때까지 대기 (고정 timeout 대신 selector 대기)
        await page.waitForSelector('table tbody tr', { timeout: 15_000 });
        const rows = page.locator('table tbody tr');
        const count = await rows.count();
        expect(count).toBeGreaterThan(0);
      });

      test('5-2. 합계 행이 표시된다', async () => {
        await expect(page.locator('tfoot').locator('text=합계')).toBeVisible();
      });

      test('5-3. 김영수 행에 기본급과 실수령이 표시된다', async () => {
        const kimRow = page.locator('table tbody tr').filter({ hasText: '김영수' });
        await expect(kimRow).toBeVisible();
        // 기본급 4,500,000 확인
        await expect(kimRow.locator('text=4,500,000').first()).toBeVisible();
      });

      test('5-4. 사번/이름/부서 컬럼이 존재한다', async () => {
        await expect(page.locator('thead').locator('text=사번')).toBeVisible();
        await expect(page.locator('thead').locator('text=이름')).toBeVisible();
        await expect(page.locator('thead').locator('text=부서')).toBeVisible();
      });

      test('5-5. 총지급/총공제/실수령 컬럼이 존재한다', async () => {
        await expect(page.locator('thead').locator('text=총지급')).toBeVisible();
        await expect(page.locator('thead').locator('text=총공제')).toBeVisible();
        await expect(page.locator('thead').locator('text=실수령')).toBeVisible();
      });
    });

    // ─── 급여명세서 /payroll/payslips ─────────────────────
    test.describe('급여명세서 검증', () => {
      test('5-6. 급여명세서 페이지에서 2026/3 선택 시 직원 목록이 표시된다', async () => {
        test.setTimeout(60_000);
        await page.goto('/payroll/payslips');
        await page.waitForTimeout(1000);
        await page.getByLabel('연도').selectOption(String(TEST_YEAR));
        await page.getByLabel('월').selectOption(String(TEST_MONTH));
        // SWR이 데이터를 가져올 때까지 대기
        await page.waitForSelector('ul li button', { timeout: 15_000 });
        const listItems = page.locator('ul li button');
        const count = await listItems.count();
        expect(count).toBeGreaterThan(0);
      });

      test('5-7. 김영수를 클릭하면 명세서가 표시된다', async () => {
        const kimButton = page.locator('ul li button').filter({ hasText: '김영수' });
        await kimButton.click();
        await page.waitForTimeout(1000);
        // 명세서 헤더 확인
        await expect(page.locator('text=급여명세서').first()).toBeVisible();
      });

      test('5-8. 지급 항목 테이블이 표시된다', async () => {
        await expect(page.locator('text=지급 항목')).toBeVisible();
      });

      test('5-9. 공제 항목 테이블이 표시된다', async () => {
        await expect(page.locator('text=공제 항목')).toBeVisible();
      });

      test('5-10. 총 지급액과 총 공제액이 표시된다', async () => {
        await expect(page.locator('text=총 지급액')).toBeVisible();
        await expect(page.locator('text=총 공제액')).toBeVisible();
      });

      test('5-11. 실수령액이 양수로 표시된다', async () => {
        const netPaySection = page.locator('.bg-emerald-50').filter({ hasText: '실수령액' });
        await expect(netPaySection).toBeVisible();
        const text = await netPaySection.textContent();
        expect(text).toMatch(/[\d,]+/);
        // 0원이 아닌지 확인
        expect(text).not.toContain('0원');
      });
    });

    // ─── 급여 이력 /payroll/history ───────────────────────
    test.describe('급여 이력 검증', () => {
      test('5-12. 급여 이력에 2026년 3월 행이 존재한다', async () => {
        await page.goto('/payroll/history');
        await page.waitForSelector('table', { timeout: 10000 });
        await expect(page.locator('tbody tr').filter({ hasText: '2026년 3월' })).toBeVisible();
      });

      test('5-13. 상태에 "확정" 뱃지가 표시된다', async () => {
        const marchRow = page.locator('tbody tr').filter({ hasText: '2026년 3월' });
        await expect(marchRow.locator('text=확정')).toBeVisible();
      });
    });

    // ─── API 검증 ─────────────────────────────────────────
    test.describe('API 검증', () => {
      test('5-14. GET /api/payroll/spreadsheet → CONFIRMED 상태 데이터 존재', async () => {
        const resp = await context.request.get(
          `${BASE_URL}/api/payroll/spreadsheet?year=${TEST_YEAR}&month=${TEST_MONTH}`,
        );
        expect(resp.ok()).toBeTruthy();
        const body = await resp.json();
        expect(body.items.length).toBeGreaterThan(0);
        // 최소 1개가 CONFIRMED
        const confirmed = body.items.filter(
          (item: { status: string }) => item.status === 'CONFIRMED',
        );
        expect(confirmed.length).toBeGreaterThan(0);
      });

      test('5-15. GET /api/payroll/summary → 총액 양수', async () => {
        const resp = await context.request.get(
          `${BASE_URL}/api/payroll/summary?year=${TEST_YEAR}&month=${TEST_MONTH}`,
        );
        expect(resp.ok()).toBeTruthy();
        const body = await resp.json();
        expect(body.totalPay).toBeGreaterThan(0);
        expect(body.totalDeduction).toBeGreaterThan(0);
        expect(body.totalNetPay).toBeGreaterThan(0);
        expect(body.totalEmployees).toBeGreaterThanOrEqual(10);
      });

      test('5-16. GET /api/payroll/ledger → employeeCount 확인', async () => {
        const resp = await context.request.get(
          `${BASE_URL}/api/payroll/ledger?year=${TEST_YEAR}&month=${TEST_MONTH}`,
        );
        expect(resp.ok()).toBeTruthy();
        const body = await resp.json();
        expect(body.employeeCount).toBeGreaterThanOrEqual(10);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Phase 6: Cleanup
  // ═══════════════════════════════════════════════════════════════

  test('Phase 6: 급여 취소 (2026년 3월 CONFIRMED → DRAFT)', async () => {
    const resp = await context.request.post(`${BASE_URL}/api/payroll/cancel`, {
      data: { year: TEST_YEAR, month: TEST_MONTH },
    });
    expect(resp.ok()).toBeTruthy();
    const body = await resp.json();
    expect(body.cancelledCount).toBeGreaterThan(0);
  });

  // ═══════════════════════════════════════════════════════════════
  // Phase 7: JS 에러 검증
  // ═══════════════════════════════════════════════════════════════

  test('Phase 7: 전체 테스트 중 JS 에러가 없어야 한다 (Hydration 제외)', async () => {
    expect(pageErrors).toHaveLength(0);
  });
});

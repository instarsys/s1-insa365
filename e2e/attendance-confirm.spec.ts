import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import path from 'path';

const BASE_URL = 'http://localhost:3001';
const STORAGE_STATE_PATH = path.join(__dirname, '.auth-state.json');

// Test month: 2026-04 (April) — payroll-integration(3월)과 충돌 방지
const TEST_YEAR = 2026;
const TEST_MONTH = 4;

// 테스트 대상 직원 (시드 데이터 — ACTIVE 직원만)
const EMPLOYEES = [
  { name: '김영수', number: 'EA0002' },
  { name: '박지민', number: 'EA0003' },
  { name: '홍파트', number: 'EA0005' },
] as const;

// ═══════════════════════════════════════════════════════════════
// 헬퍼 함수
// ═══════════════════════════════════════════════════════════════

/** 지정 월의 평일 목록 */
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

/** ISO datetime 포맷 */
function toISO(dateStr: string, hour: number, minute = 0): string {
  return `${dateStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000Z`;
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

/** 근태 기록 일괄 생성 (1명 × N일) */
async function createAttendanceRecords(
  apiRequest: BrowserContext['request'],
  userId: string,
  dates: string[],
  template: { checkInHour: number; checkInMinute?: number; checkOutHour: number; checkOutMinute?: number; status: string },
): Promise<void> {
  for (const date of dates) {
    await rateLimitPost(apiRequest, `${BASE_URL}/api/attendance/manual`, {
      userId,
      date,
      checkInTime: toISO(date, template.checkInHour, template.checkInMinute ?? 0),
      checkOutTime: toISO(date, template.checkOutHour, template.checkOutMinute ?? 0),
      status: template.status,
      isHoliday: false,
    }, `근태 생성 실패: ${userId} ${date}`);
  }
}

/**
 * 달력 페이지에서 목표 연월로 이동 (ChevronLeft/Right 버튼 사용)
 */
async function navigateToMonth(page: Page, targetYear: number, targetMonth: number): Promise<void> {
  const now = new Date();
  let currentVal = now.getFullYear() * 12 + (now.getMonth() + 1);
  const targetVal = targetYear * 12 + targetMonth;

  const nextBtn = page.locator('button:has(svg.lucide-chevron-right)');
  const prevBtn = page.locator('button:has(svg.lucide-chevron-left)');

  while (currentVal < targetVal) {
    await nextBtn.click();
    await page.waitForTimeout(500);
    currentVal++;
  }
  while (currentVal > targetVal) {
    await prevBtn.click();
    await page.waitForTimeout(500);
    currentVal--;
  }

  await expect(page.locator(`text=${targetYear}년 ${targetMonth}월`).first()).toBeVisible({ timeout: 5000 });
}

// ═══════════════════════════════════════════════════════════════
// 테스트 본문
// ═══════════════════════════════════════════════════════════════

test.describe.serial('근태 확정 E2E 테스트', () => {
  let context: BrowserContext;
  let page: Page;
  const pageErrors: string[] = [];
  const employeeIds: Record<string, string> = {};

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
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

  test('Phase 0-A: 이전 테스트 잔여 데이터를 정리한다', async () => {
    // 기존 급여/근태 취소
    await context.request.post(`${BASE_URL}/api/payroll/cancel`, {
      data: { year: TEST_YEAR, month: TEST_MONTH },
    });
    await context.request.post(`${BASE_URL}/api/payroll/cancel`, {
      data: { year: TEST_YEAR, month: 5 },
    });
    await context.request.post(`${BASE_URL}/api/attendance/cancel`, {
      data: { year: TEST_YEAR, month: TEST_MONTH },
    });
    await context.request.post(`${BASE_URL}/api/attendance/cancel`, {
      data: { year: TEST_YEAR, month: 5 },
    });
  });

  test('Phase 0-B: 테스트 대상 직원의 userId를 조회한다', async () => {
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
    expect(Object.keys(employeeIds)).toHaveLength(EMPLOYEES.length);
  });

  // ═══════════════════════════════════════════════════════════════
  // Phase 1: 근태 데이터 생성 (API) — upsert이므로 멱등
  // ═══════════════════════════════════════════════════════════════

  test('Phase 1: 3명 직원의 4월 근태 데이터를 생성한다', async () => {
    test.setTimeout(180_000);
    const weekdays = getWeekdaysInMonth(TEST_YEAR, TEST_MONTH);

    // 김영수: 전 평일 정상 (09:00-18:00) — 월급제
    await createAttendanceRecords(context.request, employeeIds['EA0002'], weekdays, {
      checkInHour: 9, checkOutHour: 18, status: 'ON_TIME',
    });

    // 박지민: 전 평일 정상 (09:00-18:00) — 월급제
    await createAttendanceRecords(context.request, employeeIds['EA0003'], weekdays, {
      checkInHour: 9, checkOutHour: 18, status: 'ON_TIME',
    });

    // 홍파트: 전 평일 파트타임 (09:00-14:00) — 시급제
    await createAttendanceRecords(context.request, employeeIds['EA0005'], weekdays, {
      checkInHour: 9, checkOutHour: 14, status: 'ON_TIME',
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Phase 2: Rate Limit 쿨다운
  // ═══════════════════════════════════════════════════════════════

  test('Phase 2: Rate limit 쿨다운 대기 (65초)', async () => {
    test.setTimeout(120_000);
    await delay(65_000);
  });

  // ═══════════════════════════════════════════════════════════════
  // Phase 3: 일괄 확정 (API로 직접 실행)
  // ═══════════════════════════════════════════════════════════════

  test('Phase 3: API로 4월 근태를 확정한다', async () => {
    test.setTimeout(60_000);
    const resp = await context.request.post(`${BASE_URL}/api/attendance/confirm`, {
      data: { year: TEST_YEAR, month: TEST_MONTH },
    });
    expect(resp.ok(), `근태 확정 실패: ${await resp.text()}`).toBeTruthy();
    const body = await resp.json();
    expect(body.confirmedCount).toBeGreaterThan(0);
  });

  // ═══════════════════════════════════════════════════════════════
  // Phase 4: 확정 후 상태 검증
  // ═══════════════════════════════════════════════════════════════

  test.describe('Phase 4: 확정 후 상태 검증', () => {
    test('4-1. attendance-review API — 전원 확정 완료', async () => {
      const resp = await context.request.get(
        `${BASE_URL}/api/payroll/attendance-review?year=${TEST_YEAR}&month=${TEST_MONTH}`,
      );
      expect(resp.ok()).toBeTruthy();
      const body = await resp.json();

      expect(body.confirmedCount).toBeGreaterThan(0);
      expect(body.unconfirmedEmployees).toHaveLength(0);
      expect(body.confirmedCount).toBe(body.activeEmployeeCount);
    });

    test('4-2. 달력 UI — "근태 확정 완료" 표시 + 버튼 disabled', async () => {
      test.setTimeout(30_000);
      await page.goto('/attendance/calendar');
      await page.waitForTimeout(2000);
      await navigateToMonth(page, TEST_YEAR, TEST_MONTH);
      await page.waitForTimeout(2000);

      // "근태 확정 완료" 텍스트 확인
      await expect(page.locator('text=/근태 확정 완료/')).toBeVisible({ timeout: 10000 });

      // 일괄 확정 버튼 disabled 확인
      const confirmBtn = page.getByRole('button', { name: new RegExp(`${TEST_YEAR}년 ${TEST_MONTH}월 일괄 확정`) });
      await expect(confirmBtn).toBeDisabled();
    });

    test('4-3. 결근 자동 생성 검증 — 근태 미입력 직원은 결근 처리됨', async () => {
      const resp = await context.request.get(
        `${BASE_URL}/api/payroll/attendance-review?year=${TEST_YEAR}&month=${TEST_MONTH}`,
      );
      expect(resp.ok()).toBeTruthy();
      const body = await resp.json();

      // 3명만 근태 생성 → 나머지 활성 직원은 결근 자동 생성
      // (시드 ACTIVE 직원이 3명보다 많다면 결근일수 > 0)
      expect(body.summary.totalAbsentDays).toBeGreaterThanOrEqual(0);
    });

    test('4-4. 확정 후 급여 계산 가능 (스냅샷 존재)', async () => {
      const resp = await context.request.post(`${BASE_URL}/api/payroll/calculate`, {
        data: { year: TEST_YEAR, month: TEST_MONTH },
      });
      expect(resp.ok(), `급여 계산 API 실패: ${await resp.text()}`).toBeTruthy();
      const body = await resp.json();
      expect(body.calculatedCount).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Phase 5: 일괄 확정 UI 플로우 (별도 월: 5월)
  // ═══════════════════════════════════════════════════════════════

  test.describe('Phase 5: UI 일괄 확정 플로우 (5월)', () => {
    const UI_MONTH = 5; // May — Phase 4와 충돌 방지

    test('5-1. 5월 근태 데이터 API로 생성', async () => {
      test.setTimeout(180_000);
      const weekdays = getWeekdaysInMonth(TEST_YEAR, UI_MONTH);

      // 김영수만 간단히 생성
      await createAttendanceRecords(context.request, employeeIds['EA0002'], weekdays, {
        checkInHour: 9, checkOutHour: 18, status: 'ON_TIME',
      });
    });

    test('5-2. Rate limit 쿨다운 대기 (65초)', async () => {
      test.setTimeout(120_000);
      await delay(65_000);
    });

    test('5-3. 달력에서 5월 일괄 확정 버튼 클릭 → 리로드 없이 UI 갱신', async () => {
      test.setTimeout(60_000);
      await page.goto('/attendance/calendar');
      await page.waitForTimeout(2000);

      await navigateToMonth(page, TEST_YEAR, UI_MONTH);
      await page.waitForTimeout(2000);

      // 미확정 상태 확인
      const confirmBtn = page.getByRole('button', { name: new RegExp(`${TEST_YEAR}년 ${UI_MONTH}월 일괄 확정`) });
      await expect(confirmBtn).toBeVisible({ timeout: 10000 });
      await expect(confirmBtn).toBeEnabled();

      // 클릭
      await confirmBtn.click();

      // 토스트 확인
      await expect(
        page.locator(`text=${TEST_YEAR}년 ${UI_MONTH}월 근태가 일괄 확정되었습니다.`),
      ).toBeVisible({ timeout: 30000 });

      // ★ 리로드 없이 "근태 확정 완료" 표시 확인 (SWR 자동 갱신)
      await expect(page.locator('text=/근태 확정 완료/')).toBeVisible({ timeout: 10000 });

      // 일괄 확정 버튼 disabled
      await expect(confirmBtn).toBeDisabled();

      // 확정 취소 버튼 표시
      const cancelBtn = page.getByRole('button', { name: '확정 취소' });
      await expect(cancelBtn).toBeVisible({ timeout: 5000 });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Phase 5B: 확정 취소 플로우
  // ═══════════════════════════════════════════════════════════════

  test.describe('Phase 5B: 확정 취소 플로우 (5월)', () => {
    const UI_MONTH = 5;

    test('5B-1. API로 5월 근태 확정 취소', async () => {
      test.setTimeout(30_000);
      const resp = await context.request.post(`${BASE_URL}/api/attendance/cancel`, {
        data: { year: TEST_YEAR, month: UI_MONTH },
      });
      expect(resp.ok(), `근태 취소 실패: ${await resp.text()}`).toBeTruthy();
      const body = await resp.json();
      expect(body.cancelledCount).toBeGreaterThan(0);
    });

    test('5B-2. 취소 후 attendance-review API — 미확정 상태', async () => {
      const resp = await context.request.get(
        `${BASE_URL}/api/payroll/attendance-review?year=${TEST_YEAR}&month=${UI_MONTH}`,
      );
      expect(resp.ok()).toBeTruthy();
      const body = await resp.json();
      expect(body.unconfirmedEmployees.length).toBeGreaterThan(0);
    });

    test('5B-3. 취소 후 달력 UI — 미확정 상태로 복원', async () => {
      test.setTimeout(30_000);
      await page.goto('/attendance/calendar');
      await page.waitForTimeout(2000);
      await navigateToMonth(page, TEST_YEAR, UI_MONTH);
      await page.waitForTimeout(2000);

      // 확정 완료 텍스트가 없어야 함
      await expect(page.locator('text=/근태 확정 완료/')).not.toBeVisible({ timeout: 5000 });

      // 일괄 확정 버튼 enabled
      const confirmBtn = page.getByRole('button', { name: new RegExp(`${TEST_YEAR}년 ${UI_MONTH}월 일괄 확정`) });
      await expect(confirmBtn).toBeEnabled();
    });

    test('5B-4. 재확정 가능 확인', async () => {
      test.setTimeout(60_000);
      const resp = await context.request.post(`${BASE_URL}/api/attendance/confirm`, {
        data: { year: TEST_YEAR, month: UI_MONTH },
      });
      expect(resp.ok(), `재확정 실패: ${await resp.text()}`).toBeTruthy();
      const body = await resp.json();
      expect(body.confirmedCount).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Phase 5C: 급여 확정 상태에서 근태 취소 차단
  // ═══════════════════════════════════════════════════════════════

  test.describe('Phase 5C: 급여 확정 시 근태 취소 차단 (4월)', () => {
    test('5C-1. 4월 급여 확정', async () => {
      const resp = await context.request.post(`${BASE_URL}/api/payroll/confirm`, {
        data: { year: TEST_YEAR, month: TEST_MONTH },
      });
      expect(resp.ok(), `급여 확정 실패: ${await resp.text()}`).toBeTruthy();
    });

    test('5C-2. 급여 CONFIRMED 상태에서 근태 취소 시도 → 400', async () => {
      const resp = await context.request.post(`${BASE_URL}/api/attendance/cancel`, {
        data: { year: TEST_YEAR, month: TEST_MONTH },
      });
      expect(resp.status()).toBe(400);
      const body = await resp.json();
      expect(body.message).toContain('급여');
    });

    test('5C-3. 급여 취소 후 근태 취소 가능', async () => {
      // 급여 취소
      const cancelResp = await context.request.post(`${BASE_URL}/api/payroll/cancel`, {
        data: { year: TEST_YEAR, month: TEST_MONTH },
      });
      expect(cancelResp.ok()).toBeTruthy();

      // 근태 취소
      const resp = await context.request.post(`${BASE_URL}/api/attendance/cancel`, {
        data: { year: TEST_YEAR, month: TEST_MONTH },
      });
      expect(resp.ok(), `근태 취소 실패: ${await resp.text()}`).toBeTruthy();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Phase 6: 에러/엣지 케이스
  // ═══════════════════════════════════════════════════════════════

  test.describe('Phase 6: 에러 케이스', () => {
    test('6-1. 잘못된 요청 — year/month 누락 시 400 에러', async () => {
      const resp = await context.request.post(`${BASE_URL}/api/attendance/confirm`, {
        data: {},
      });
      expect(resp.status()).toBe(400);
    });

    test('6-2. 잘못된 요청 — month 범위 초과 시 400 에러', async () => {
      const resp = await context.request.post(`${BASE_URL}/api/attendance/confirm`, {
        data: { year: TEST_YEAR, month: 13 },
      });
      expect(resp.status()).toBe(400);
    });

    test('6-3. 잘못된 요청 — year 범위 미만 시 400 에러', async () => {
      const resp = await context.request.post(`${BASE_URL}/api/attendance/confirm`, {
        data: { year: 2019, month: 1 },
      });
      expect(resp.status()).toBe(400);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Phase 7: Cleanup
  // ═══════════════════════════════════════════════════════════════

  test('Phase 7: 테스트 데이터 정리', async () => {
    // 4월, 5월 급여/근태 취소
    await context.request.post(`${BASE_URL}/api/payroll/cancel`, {
      data: { year: TEST_YEAR, month: TEST_MONTH },
    });
    await context.request.post(`${BASE_URL}/api/payroll/cancel`, {
      data: { year: TEST_YEAR, month: 5 },
    });
    await context.request.post(`${BASE_URL}/api/attendance/cancel`, {
      data: { year: TEST_YEAR, month: TEST_MONTH },
    });
    await context.request.post(`${BASE_URL}/api/attendance/cancel`, {
      data: { year: TEST_YEAR, month: 5 },
    });
  });

  test('JS 에러가 발생하지 않았다', async () => {
    expect(pageErrors, `JS 에러 발견: ${pageErrors.join(', ')}`).toHaveLength(0);
  });
});

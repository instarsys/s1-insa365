import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import path from 'path';

const ADMIN_EMAIL = 'admin@test-company.com';
const ADMIN_PASSWORD = 'admin123!';
const STORAGE_STATE_PATH = path.join(__dirname, '.auth-state.json');

async function loginAndSaveState(page: Page) {
  await page.goto('/login');
  await page.getByRole('textbox', { name: '이메일' }).fill(ADMIN_EMAIL);
  await page.getByRole('textbox', { name: '비밀번호' }).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: '로그인' }).click();
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await page.context().storageState({ path: STORAGE_STATE_PATH });
}

test.describe.serial('근태 관리 E2E 테스트', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context.close();
  });

  // ═══════════════════════════════════════════════════════════════
  // 1. 일별 근태 (/attendance/daily)
  // ═══════════════════════════════════════════════════════════════

  test.describe('일별 근태', () => {
    test.beforeAll(async () => {
      await page.goto('/attendance/daily');
      await page.waitForTimeout(2000);
    });

    // ─── 1-1. 페이지 헤더 ──────────────────────────────────────

    test('1-1. 제목 "일별 근태"가 보인다', async () => {
      await expect(page.getByRole('heading', { name: '일별 근태' })).toBeVisible();
    });

    test('1-2. 부제목이 보인다', async () => {
      await expect(page.locator('text=일별 출퇴근 현황을 확인합니다.')).toBeVisible();
    });

    test('1-3. 수동 입력 버튼이 보인다', async () => {
      await expect(page.getByRole('button', { name: '수동 입력' })).toBeVisible();
    });

    // ─── 1-2. 날짜 선택 ────────────────────────────────────────

    test('1-4. 날짜 input이 보이고 오늘 날짜가 기본값이다', async () => {
      const dateInput = page.locator('input[type="date"]');
      await expect(dateInput).toBeVisible();
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      await expect(dateInput).toHaveValue(today);
    });

    // ─── 1-3. 빈 상태 ─────────────────────────────────────────

    test('1-5. 데이터 없을 때 빈 상태 메시지가 보인다', async () => {
      await expect(page.getByRole('heading', { name: '해당 날짜에 근태 기록이 없습니다' })).toBeVisible();
    });

    test('1-6. 빈 상태 부가 설명이 보인다', async () => {
      await expect(page.locator('text=직원들이 출퇴근을 기록하면 여기에 표시됩니다.')).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 2. 월별 현황 (/attendance/monthly)
  // ═══════════════════════════════════════════════════════════════

  test.describe('월별 현황', () => {
    test.beforeAll(async () => {
      await page.goto('/attendance/monthly');
      await page.waitForSelector('table', { timeout: 10000 });
    });

    // ─── 2-1. 페이지 헤더 ──────────────────────────────────────

    test('2-1. 제목 "월별 현황"이 보인다', async () => {
      await expect(page.getByRole('heading', { name: '월별 현황' })).toBeVisible();
    });

    test('2-2. 부제목이 보인다', async () => {
      await expect(page.locator('text=월별 근태 현황을 확인하고 확정합니다.')).toBeVisible();
    });

    test('2-3. 일괄 확정 버튼이 보인다', async () => {
      await expect(page.getByRole('button', { name: '일괄 확정' })).toBeVisible();
    });

    // ─── 2-2. 필터 (연도/월/부서) ──────────────────────────────

    test('2-4. 연도 드롭다운에 2026년이 선택되어 있다', async () => {
      const yearSelect = page.locator('main').getByRole('combobox').first();
      await expect(yearSelect).toBeVisible();
      const selectedOption = await yearSelect.inputValue();
      expect(selectedOption).toBe('2026');
    });

    test('2-5. 월 드롭다운에 현재 월이 선택되어 있다', async () => {
      const monthSelect = page.locator('main').getByRole('combobox').nth(1);
      await expect(monthSelect).toBeVisible();
      const currentMonth = String(new Date().getMonth() + 1);
      const selectedOption = await monthSelect.inputValue();
      expect(selectedOption).toBe(currentMonth);
    });

    test('2-6. 부서 드롭다운에 5개 부서가 있다', async () => {
      const deptSelect = page.locator('main').getByRole('combobox').nth(2);
      await expect(deptSelect).toBeVisible();
      const options = deptSelect.locator('option');
      const count = await options.count();
      expect(count).toBeGreaterThanOrEqual(6); // 전체 부서(disabled) + 전체 부서 + 5개 부서
    });

    // ─── 2-3. 테이블 ──────────────────────────────────────────

    test('2-7. 8개 컬럼 헤더가 보인다', async () => {
      const headers = ['이름', '부서', '근무일', '결근', '지각', '정규시간', '연장시간', '야간시간'];
      for (const header of headers) {
        await expect(page.getByRole('columnheader', { name: header })).toBeVisible();
      }
    });

    test('2-8. 테이블에 데이터 행이 있다', async () => {
      const rows = page.locator('tbody tr');
      const count = await rows.count();
      expect(count).toBeGreaterThan(0);
    });

    // ─── 2-4. 합계 바 ─────────────────────────────────────────

    test('2-9. 하단에 합계 영역이 보인다', async () => {
      await expect(page.locator('text=합계')).toBeVisible();
    });

    test('2-10. 합계에 근무일/결근/지각/정규/연장/야간 라벨이 보인다', async () => {
      for (const label of ['근무일:', '결근:', '지각:', '정규:', '연장:', '야간:']) {
        await expect(page.locator(`text=${label}`).first()).toBeVisible();
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 3. 휴가 관리 (/attendance/leave)
  // ═══════════════════════════════════════════════════════════════

  test.describe('휴가 관리', () => {
    test.beforeAll(async () => {
      await page.goto('/attendance/leave');
      await page.waitForTimeout(2000);
    });

    // ─── 3-1. 페이지 헤더 ──────────────────────────────────────

    test('3-1. 제목 "휴가 관리"가 보인다', async () => {
      await expect(page.getByRole('heading', { name: '휴가 관리' })).toBeVisible();
    });

    test('3-2. 부제목이 보인다', async () => {
      await expect(page.locator('text=휴가 신청을 승인/반려합니다.')).toBeVisible();
    });

    // ─── 3-2. 상태 탭 ─────────────────────────────────────────

    test('3-3. 대기 탭에 카운트가 표시된다', async () => {
      await expect(page.getByRole('button', { name: /대기 \d+/ })).toBeVisible();
    });

    test('3-4. 전체 탭이 보인다', async () => {
      await expect(page.getByRole('button', { name: '전체' })).toBeVisible();
    });

    // ─── 3-3. 빈 상태 ─────────────────────────────────────────

    test('3-5. 대기 신청 없을 때 빈 상태 메시지가 보인다', async () => {
      await expect(page.getByRole('heading', { name: '대기 중인 휴가 신청이 없습니다' })).toBeVisible();
    });

    test('3-6. 빈 상태 부가 설명이 보인다', async () => {
      await expect(page.locator('text=직원이 휴가를 신청하면 여기에 표시됩니다.')).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 4. 52시간 모니터링 (/attendance/overtime)
  // ═══════════════════════════════════════════════════════════════

  test.describe('52시간 모니터링', () => {
    test.beforeAll(async () => {
      await page.goto('/attendance/overtime');
      await page.waitForTimeout(2000);
    });

    // ─── 4-1. 페이지 헤더 ──────────────────────────────────────

    test('4-1. 제목 "52시간 모니터링"이 보인다', async () => {
      await expect(page.getByRole('heading', { name: '52시간 모니터링' })).toBeVisible();
    });

    test('4-2. 부제목이 보인다', async () => {
      await expect(page.locator('text=주 52시간 초과 위험 직원을 모니터링합니다.')).toBeVisible();
    });

    // ─── 4-2. 빈 상태 ─────────────────────────────────────────

    test('4-3. 데이터 없을 때 빈 상태 메시지가 보인다', async () => {
      await expect(page.getByRole('heading', { name: '금주 근무 기록이 없습니다' })).toBeVisible();
    });

    test('4-4. 빈 상태 부가 설명이 보인다', async () => {
      await expect(page.locator('text=직원들의 출퇴근 기록이 쌓이면 52시간 현황이 표시됩니다.')).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 5. 콘솔 에러 검증
  // ═══════════════════════════════════════════════════════════════

  test('5-1. 일별 근태에서 JS 에러가 없다', async ({ browser }) => {
    const authContext = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const authPage = await authContext.newPage();

    const errors: string[] = [];
    authPage.on('pageerror', (err) => {
      errors.push(err.message);
    });

    await authPage.goto('/attendance/daily');
    await authPage.waitForTimeout(2000);

    expect(errors).toHaveLength(0);
    await authContext.close();
  });

  test('5-2. 월별 현황에서 JS 에러가 없다', async ({ browser }) => {
    const authContext = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const authPage = await authContext.newPage();

    const errors: string[] = [];
    authPage.on('pageerror', (err) => {
      errors.push(err.message);
    });

    await authPage.goto('/attendance/monthly');
    await authPage.waitForSelector('table', { timeout: 10000 });
    await authPage.waitForTimeout(2000);

    expect(errors).toHaveLength(0);
    await authContext.close();
  });
});

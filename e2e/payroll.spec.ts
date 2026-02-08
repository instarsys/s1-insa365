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

test.describe.serial('급여 관리 E2E 테스트', () => {
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
  // 1. 급여 실행 (/payroll/run)
  // ═══════════════════════════════════════════════════════════════

  test.describe('급여 실행', () => {
    test.beforeAll(async () => {
      await page.goto('/payroll/run');
      await page.waitForTimeout(2000);
    });

    // ─── 1-1. 페이지 헤더 ──────────────────────────────────────

    test('1-1. 제목 "급여 실행"이 보인다', async () => {
      await expect(page.getByRole('heading', { name: '급여 실행' })).toBeVisible();
    });

    test('1-2. 부제목이 보인다', async () => {
      await expect(page.locator('text=3단계로 급여를 계산하고 확정합니다.')).toBeVisible();
    });

    // ─── 1-2. 3단계 스텝 인디케이터 ────────────────────────────

    test('1-3. Step 1 "급여 입력" 라벨이 보인다', async () => {
      await expect(page.getByText('급여 입력', { exact: true })).toBeVisible();
    });

    test('1-4. Step 2 "검토" 라벨이 보인다', async () => {
      await expect(page.getByText('검토', { exact: true })).toBeVisible();
    });

    test('1-5. Step 3 "확정" 라벨이 보인다', async () => {
      await expect(page.getByText('확정', { exact: true }).first()).toBeVisible();
    });

    test('1-6. 스텝 번호 1, 2, 3이 보인다', async () => {
      for (const num of ['1', '2', '3']) {
        await expect(page.locator(`main >> text="${num}"`).first()).toBeVisible();
      }
    });

    // ─── 1-3. 연도/월 필터 ─────────────────────────────────────

    test('1-7. 연도 드롭다운에 2026년이 선택되어 있다', async () => {
      const yearSelect = page.getByLabel('연도');
      await expect(yearSelect).toBeVisible();
      await expect(yearSelect).toHaveValue('2026');
    });

    test('1-8. 월 드롭다운에 현재 월이 선택되어 있다', async () => {
      const monthSelect = page.getByLabel('월');
      await expect(monthSelect).toBeVisible();
      const currentMonth = String(new Date().getMonth() + 1);
      await expect(monthSelect).toHaveValue(currentMonth);
    });

    test('1-9. 계산하기 버튼이 보인다', async () => {
      await expect(page.getByRole('button', { name: '계산하기' })).toBeVisible();
    });

    // ─── 1-4. Step 1 콘텐츠 ────────────────────────────────────

    test('1-10. 서브 헤더에 급여 입력 제목이 보인다', async () => {
      const currentMonth = new Date().getMonth() + 1;
      await expect(page.getByRole('heading', { name: `2026년 ${currentMonth}월 급여 입력` })).toBeVisible();
    });

    test('1-11. 직원수 뱃지가 보인다', async () => {
      await expect(page.locator('text=/\\d+명/')).toBeVisible();
    });

    // ─── 1-5. 빈 상태 ─────────────────────────────────────────

    test('1-12. 데이터 없을 때 빈 상태 메시지가 보인다', async () => {
      await expect(page.getByRole('heading', { name: '급여 데이터가 없습니다' })).toBeVisible();
    });

    test('1-13. 빈 상태 부가 설명이 보인다', async () => {
      await expect(page.locator('text=계산하기 버튼을 눌러 급여를 생성하세요.')).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 2. 급여 이력 (/payroll/history)
  // ═══════════════════════════════════════════════════════════════

  test.describe('급여 이력', () => {
    test.beforeAll(async () => {
      await page.goto('/payroll/history');
      await page.waitForSelector('table', { timeout: 10000 });
    });

    // ─── 2-1. 페이지 헤더 ──────────────────────────────────────

    test('2-1. 제목 "급여 이력"이 보인다', async () => {
      await expect(page.getByRole('heading', { name: '급여 이력' })).toBeVisible();
    });

    test('2-2. 부제목이 보인다', async () => {
      await expect(page.locator('text=과거 급여 실행 이력을 조회합니다.')).toBeVisible();
    });

    // ─── 2-2. 테이블 ──────────────────────────────────────────

    test('2-3. 7개 컬럼 헤더가 보인다', async () => {
      const headers = ['급여월', '직원수', '총지급액', '총공제', '총실수령', '상태', '확정일'];
      for (const header of headers) {
        await expect(page.getByRole('columnheader', { name: header })).toBeVisible();
      }
    });

    test('2-4. 테이블에 데이터 행이 있다', async () => {
      const rows = page.locator('tbody tr');
      const count = await rows.count();
      expect(count).toBeGreaterThan(0);
    });

    test('2-5. 첫 번째 행에 "2026년 1월" 급여월이 표시된다', async () => {
      await expect(page.locator('tbody tr').first().locator('text=2026년 1월')).toBeVisible();
    });

    test('2-6. 금액이 "원" 단위로 표시된다', async () => {
      await expect(page.locator('tbody tr').first().locator('text=/[\\d,]+원/').first()).toBeVisible();
    });

    test('2-7. 상태 뱃지에 "확정"이 표시된다', async () => {
      await expect(page.locator('tbody tr').first().locator('text=확정')).toBeVisible();
    });

    // ─── 2-3. 페이지네이션 ─────────────────────────────────────

    test('2-8. 페이지 버튼이 있다', async () => {
      const paginationNav = page.locator('main nav');
      await expect(paginationNav.getByRole('button', { name: '1' })).toBeVisible();
      await expect(paginationNav.getByRole('button', { name: '2' })).toBeVisible();
    });

    test('2-9. 1페이지에서 이전 버튼이 disabled이다', async () => {
      const paginationNav = page.locator('main nav');
      const prevButton = paginationNav.getByRole('button').first();
      await expect(prevButton).toBeDisabled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 3. 급여대장 (/payroll/ledger)
  // ═══════════════════════════════════════════════════════════════

  test.describe('급여대장', () => {
    test.beforeAll(async () => {
      await page.goto('/payroll/ledger');
      await page.waitForTimeout(2000);
    });

    // ─── 3-1. 페이지 헤더 ──────────────────────────────────────

    test('3-1. 제목 "급여대장"이 보인다', async () => {
      await expect(page.getByRole('heading', { name: '급여대장', exact: true })).toBeVisible();
    });

    test('3-2. 부제목이 보인다', async () => {
      await expect(page.locator('text=확정된 급여대장을 조회합니다.')).toBeVisible();
    });

    test('3-3. Excel 다운로드 버튼이 보인다 (disabled)', async () => {
      const btn = page.getByRole('button', { name: 'Excel 다운로드' });
      await expect(btn).toBeVisible();
      await expect(btn).toBeDisabled();
    });

    // ─── 3-2. 연도/월 필터 ─────────────────────────────────────

    test('3-4. 연도 드롭다운에 2026년이 선택되어 있다', async () => {
      await expect(page.getByLabel('연도')).toHaveValue('2026');
    });

    test('3-5. 월 드롭다운이 보인다', async () => {
      await expect(page.getByLabel('월')).toBeVisible();
    });

    // ─── 3-3. 빈 상태 ─────────────────────────────────────────

    test('3-6. 서브 헤더에 급여대장 제목이 보인다', async () => {
      const currentMonth = new Date().getMonth() + 1;
      await expect(page.getByRole('heading', { name: `2026년 ${currentMonth}월 급여대장` })).toBeVisible();
    });

    test('3-7. 데이터 없을 때 빈 상태 메시지가 보인다', async () => {
      await expect(page.getByRole('heading', { name: '급여대장이 없습니다' })).toBeVisible();
    });

    test('3-8. 빈 상태 부가 설명이 보인다', async () => {
      await expect(page.locator('text=급여를 확정하면 급여대장이 생성됩니다.')).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 4. 급여명세서 (/payroll/payslips)
  // ═══════════════════════════════════════════════════════════════

  test.describe('급여명세서', () => {
    test.beforeAll(async () => {
      await page.goto('/payroll/payslips');
      await page.waitForTimeout(2000);
    });

    // ─── 4-1. 페이지 헤더 ──────────────────────────────────────

    test('4-1. 제목 "급여명세서"가 보인다', async () => {
      await expect(page.getByRole('heading', { name: '급여명세서', exact: true })).toBeVisible();
    });

    test('4-2. 부제목이 보인다', async () => {
      await expect(page.locator('text=직원별 급여명세서를 조회하고 발송합니다.')).toBeVisible();
    });

    test('4-3. 인쇄 버튼이 보인다 (disabled)', async () => {
      const btn = page.getByRole('button', { name: '인쇄' });
      await expect(btn).toBeVisible();
      await expect(btn).toBeDisabled();
    });

    // ─── 4-2. 연도/월 필터 + 검색 ──────────────────────────────

    test('4-4. 연도 드롭다운에 2026년이 선택되어 있다', async () => {
      await expect(page.getByLabel('연도')).toHaveValue('2026');
    });

    test('4-5. 월 드롭다운이 보인다', async () => {
      await expect(page.getByLabel('월')).toBeVisible();
    });

    test('4-6. 검색 입력창이 보인다', async () => {
      await expect(page.getByRole('textbox', { name: /검색/ })).toBeVisible();
    });

    // ─── 4-3. 2컬럼 레이아웃 ───────────────────────────────────

    test('4-7. 좌측에 "직원 목록" heading이 보인다', async () => {
      await expect(page.getByRole('heading', { name: '직원 목록' })).toBeVisible();
    });

    test('4-8. 우측에 "직원을 선택하세요" 안내가 보인다', async () => {
      await expect(page.getByRole('heading', { name: '직원을 선택하세요' })).toBeVisible();
    });

    test('4-9. 부가 설명이 보인다', async () => {
      await expect(page.locator('text=왼쪽 목록에서 직원을 선택하면 급여명세서가 표시됩니다.')).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 5. 콘솔 에러 검증
  // ═══════════════════════════════════════════════════════════════

  test('5-1. 급여 실행에서 JS 에러가 없다', async ({ browser }) => {
    const authContext = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const authPage = await authContext.newPage();

    const errors: string[] = [];
    authPage.on('pageerror', (err) => {
      errors.push(err.message);
    });

    await authPage.goto('/payroll/run');
    await authPage.waitForTimeout(2000);

    expect(errors).toHaveLength(0);
    await authContext.close();
  });

  test('5-2. 급여 이력에서 JS 에러가 없다', async ({ browser }) => {
    const authContext = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const authPage = await authContext.newPage();

    const errors: string[] = [];
    authPage.on('pageerror', (err) => {
      errors.push(err.message);
    });

    await authPage.goto('/payroll/history');
    await authPage.waitForSelector('table', { timeout: 30000 });
    await authPage.waitForTimeout(2000);

    expect(errors).toHaveLength(0);
    await authContext.close();
  });

  test('5-3. 급여대장에서 JS 에러가 없다', async ({ browser }) => {
    const authContext = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const authPage = await authContext.newPage();

    const errors: string[] = [];
    authPage.on('pageerror', (err) => {
      errors.push(err.message);
    });

    await authPage.goto('/payroll/ledger');
    await authPage.waitForTimeout(2000);

    expect(errors).toHaveLength(0);
    await authContext.close();
  });

  test('5-4. 급여명세서에서 JS 에러가 없다', async ({ browser }) => {
    const authContext = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const authPage = await authContext.newPage();

    const errors: string[] = [];
    authPage.on('pageerror', (err) => {
      errors.push(err.message);
    });

    await authPage.goto('/payroll/payslips');
    await authPage.waitForTimeout(2000);

    expect(errors).toHaveLength(0);
    await authContext.close();
  });
});

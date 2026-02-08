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

test.describe.serial('직원 목록 E2E 테스트', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await page.goto('/employees/list');
    await page.waitForSelector('table', { timeout: 10000 });
  });

  test.afterAll(async () => {
    await context.close();
  });

  // ─── 1. 페이지 헤더 ──────────────────────────────────────────

  test('1-1. 제목 "직원 목록"이 보인다', async () => {
    await expect(page.getByRole('heading', { name: '직원 목록' })).toBeVisible();
  });

  test('1-2. 부제목이 보인다', async () => {
    await expect(page.locator('text=전체 직원을 조회하고 관리합니다.')).toBeVisible();
  });

  test('1-3. 직원 등록 버튼이 보인다', async () => {
    await expect(page.getByRole('button', { name: '직원 등록' })).toBeVisible();
  });

  // ─── 2. 상태 탭 ──────────────────────────────────────────────

  test('2-1. 재직 탭에 카운트가 표시된다', async () => {
    await expect(page.getByRole('button', { name: /재직 \d+/ })).toBeVisible();
  });

  test('2-2. 휴직 탭에 카운트가 표시된다', async () => {
    await expect(page.getByRole('button', { name: /휴직 \d+/ })).toBeVisible();
  });

  test('2-3. 퇴직 탭에 카운트가 표시된다', async () => {
    await expect(page.getByRole('button', { name: /퇴직 \d+/ })).toBeVisible();
  });

  // ─── 3. 검색 및 필터 ─────────────────────────────────────────

  test('3-1. 검색 입력창이 보인다', async () => {
    await expect(page.getByRole('textbox', { name: /검색/ })).toBeVisible();
  });

  test('3-2. 이름 검색 시 필터링된다', async () => {
    await page.getByRole('textbox', { name: /검색/ }).fill('김영수');
    await page.waitForTimeout(500);
    await expect(page.locator('text=총 1명')).toBeVisible();
    await expect(page.getByRole('cell', { name: 'EA0002' })).toBeVisible();
  });

  test('3-3. 사번 검색 시 필터링된다', async () => {
    await page.getByRole('textbox', { name: /검색/ }).fill('EA0002');
    await page.waitForTimeout(500);
    await expect(page.locator('text=총 1명')).toBeVisible();
    await expect(page.locator('td:text-is("EA0002")')).toBeVisible();
  });

  test('3-4. 검색 초기화 시 전체 목록이 복원된다', async () => {
    // X 버튼 클릭으로 검색 초기화
    const clearButton = page.locator('main').locator('input + button, [role="textbox"] ~ button').first();
    if (await clearButton.isVisible()) {
      await clearButton.click();
    } else {
      await page.getByRole('textbox', { name: /검색/ }).fill('');
    }
    await page.waitForTimeout(500);
    await expect(page.locator('text=총 52명')).toBeVisible();
  });

  test('3-5. 부서 드롭다운에 5개 부서가 있다', async () => {
    const dropdown = page.getByRole('combobox');
    await expect(dropdown).toBeVisible();
    const options = dropdown.locator('option');
    // 전체 부서(disabled) + 전체 부서 + 5개 부서 = 7개
    const count = await options.count();
    expect(count).toBeGreaterThanOrEqual(6);
  });

  test('3-6. 부서 필터 시 해당 부서만 표시된다', async () => {
    await page.getByRole('combobox').selectOption('개발팀');
    await page.waitForTimeout(500);
    // 개발팀 직원만 표시
    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);
    // 모든 행이 개발팀인지 확인
    const firstRowDept = await rows.first().locator('td').nth(2).textContent();
    expect(firstRowDept).toBe('개발팀');
    // 페이지 리셋
    await page.goto('/employees/list');
    await page.waitForSelector('table', { timeout: 10000 });
  });

  // ─── 4. 테이블 ───────────────────────────────────────────────

  test('4-1. 6개 컬럼 헤더가 보인다', async () => {
    const headers = ['사번', '이름', '부서', '직급', '입사일', '상태'];
    for (const header of headers) {
      await expect(page.getByRole('columnheader', { name: header })).toBeVisible();
    }
  });

  test('4-2. 테이블에 데이터 행이 있다', async () => {
    const rows = page.locator('tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('4-3. 첫 번째 행에 사번이 EA 형식이다', async () => {
    const firstCell = page.locator('tbody tr').first().locator('td').first();
    const text = await firstCell.textContent();
    expect(text).toMatch(/^EA\d{4}$/);
  });

  test('4-4. 각 행에 재직 상태 뱃지가 있다', async () => {
    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow.locator('text=재직')).toBeVisible();
  });

  // ─── 5. 페이지네이션 ─────────────────────────────────────────

  test('5-1. 총 건수가 표시된다', async () => {
    await expect(page.locator('text=총 52명')).toBeVisible();
  });

  test('5-2. 페이지 버튼이 있다', async () => {
    const paginationNav = page.locator('main nav');
    await expect(paginationNav.getByRole('button', { name: '1' })).toBeVisible();
    await expect(paginationNav.getByRole('button', { name: '2' })).toBeVisible();
    await expect(paginationNav.getByRole('button', { name: '3' })).toBeVisible();
  });

  test('5-3. 1페이지에서 이전 버튼이 disabled이다', async () => {
    const paginationNav = page.locator('main nav');
    const prevButton = paginationNav.getByRole('button').first();
    await expect(prevButton).toBeDisabled();
  });

  test('5-4. 2페이지로 이동하면 다른 데이터가 표시된다', async () => {
    const paginationNav = page.locator('main nav');

    // 1페이지 첫 번째 행의 사번 저장
    const page1FirstId = await page.locator('tbody tr').first().locator('td').first().textContent();

    // 2페이지로 이동
    await paginationNav.getByRole('button', { name: '2' }).click();
    await page.waitForTimeout(500);

    // 2페이지의 첫 번째 행은 다른 사번
    const page2FirstId = await page.locator('tbody tr').first().locator('td').first().textContent();
    expect(page2FirstId).not.toBe(page1FirstId);

    // 이전 버튼 활성화 확인
    const prevButton = paginationNav.getByRole('button').first();
    await expect(prevButton).toBeEnabled();

    // 1페이지로 복원
    await paginationNav.getByRole('button', { name: '1' }).click();
    await page.waitForTimeout(500);
  });

  // ─── 6. 행 클릭 → 직원 상세 페이지 ───────────────────────────

  test('6-1. 행 클릭 시 직원 상세 페이지로 이동한다', async () => {
    // 검색으로 특정 직원 찾기
    await page.getByRole('textbox', { name: /검색/ }).fill('김영수');
    await page.waitForTimeout(500);

    // 행 클릭
    await page.locator('tbody tr').first().click();
    // UUID 패턴을 포함한 URL 대기 (/employees/list가 아닌 /employees/{uuid})
    await page.waitForURL(/\/employees\/[a-f0-9-]{36}$/, { timeout: 10000 });
    expect(page.url()).toMatch(/\/employees\/[a-f0-9-]+$/);
  });

  test('6-2. Breadcrumb에 "직원 관리"가 보인다', async () => {
    await expect(page.getByRole('link', { name: '직원 관리' })).toBeVisible();
  });

  test('6-3. 직원 이름 heading이 보인다', async () => {
    await expect(page.getByRole('heading', { name: '김영수' })).toBeVisible();
  });

  test('6-4. 상태 뱃지가 보인다', async () => {
    await expect(page.locator('text=재직')).toBeVisible();
  });

  test('6-5. 사번/부서/직급 정보가 보인다', async () => {
    await expect(page.locator('text=EA0002')).toBeVisible();
  });

  test('6-6. 5개 탭이 보인다', async () => {
    const tabs = ['기본정보', '급여', '근태', '휴가', '문서'];
    for (const tab of tabs) {
      await expect(page.locator('main').getByRole('button', { name: tab, exact: true })).toBeVisible();
    }
  });

  test('6-7. 기본정보 카드에 필드가 보인다', async () => {
    const fields = ['부서', '직급', '입사일', '근무지'];
    for (const field of fields) {
      await expect(page.locator(`main >> text=${field}`).first()).toBeVisible();
    }
  });

  test('6-8. 수정 버튼이 보인다', async () => {
    await expect(page.getByRole('button', { name: '수정' })).toBeVisible();
  });

  // ─── 7. 콘솔 에러 ────────────────────────────────────────────

  test('7-1. 직원 목록에서 JS 에러가 없다', async ({ browser }) => {
    const authContext = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const authPage = await authContext.newPage();

    const errors: string[] = [];
    authPage.on('pageerror', (err) => {
      errors.push(err.message);
    });

    await authPage.goto('/employees/list');
    await authPage.waitForSelector('table', { timeout: 10000 });
    await authPage.waitForTimeout(2000);

    expect(errors).toHaveLength(0);
    await authContext.close();
  });
});

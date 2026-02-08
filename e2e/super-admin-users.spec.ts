import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import path from 'path';

const STORAGE_STATE_PATH = path.join(__dirname, '.super-admin-auth-state.json');

test.describe.serial('Super Admin 사용자 관리 E2E 테스트', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await page.goto('/super-admin/users');
    await page.waitForSelector('text=사용자 관리', { timeout: 15000 });
  });

  test.afterAll(async () => {
    await context.close();
  });

  // ─── 1. 페이지 헤더 ──────────────────────────────────────────

  test('1-1. "사용자 관리" 제목이 보인다', async () => {
    await expect(page.getByRole('heading', { name: '사용자 관리' })).toBeVisible();
  });

  test('1-2. 부제목이 보인다', async () => {
    await expect(page.locator('text=전체 사용자를 크로스 테넌트로 관리합니다.')).toBeVisible();
  });

  // ─── 2. 필터 ─────────────────────────────────────────────────

  test('2-1. 역할 필터 select가 보인다', async () => {
    await expect(page.locator('text=역할').first()).toBeVisible();
  });

  test('2-2. 회사 필터 select가 보인다', async () => {
    await expect(page.getByLabel('회사')).toBeVisible();
  });

  test('2-3. 검색 input이 보인다', async () => {
    await expect(page.getByPlaceholder('이름 또는 이메일...')).toBeVisible();
  });

  // ─── 3. 테이블 ───────────────────────────────────────────────

  test('3-1. 테이블에 "이름" 컬럼 헤더가 보인다', async () => {
    await expect(page.getByRole('columnheader', { name: '이름' })).toBeVisible();
  });

  test('3-2. 테이블에 "회사" 컬럼 헤더가 보인다', async () => {
    await expect(page.getByRole('columnheader', { name: '회사' })).toBeVisible();
  });

  test('3-3. 테이블에 "역할" 컬럼 헤더가 보인다', async () => {
    await expect(page.getByRole('columnheader', { name: '역할' })).toBeVisible();
  });

  test('3-4. 테이블에 "사번" 컬럼 헤더가 보인다', async () => {
    await expect(page.getByRole('columnheader', { name: '사번' })).toBeVisible();
  });

  test('3-5. 테이블에 "상태" 컬럼 헤더가 보인다', async () => {
    await expect(page.getByRole('columnheader', { name: '상태' })).toBeVisible();
  });

  test('3-6. 테이블에 "가입일" 컬럼 헤더가 보인다', async () => {
    await expect(page.getByRole('columnheader', { name: '가입일' })).toBeVisible();
  });

  test('3-7. 테이블에 최소 1행 데이터가 보인다', async () => {
    const rows = page.locator('table tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 10000 });
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  // ─── 4. 뱃지 ─────────────────────────────────────────────────

  test('4-1. 역할 뱃지가 표시된다', async () => {
    // 역할 뱃지 중 하나 이상이 표시되어야 함
    const roleBadges = page.locator('table tbody').locator('text=/시스템관리자|회사관리자|매니저|직원/');
    const count = await roleBadges.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('4-2. 상태 뱃지가 표시된다', async () => {
    const statusBadges = page.locator('table tbody').locator('text=/재직|휴직|퇴직/');
    const count = await statusBadges.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  // ─── 5. 역할변경 모달 ────────────────────────────────────────

  test('5-1. "역할변경" 버튼이 보인다', async () => {
    const roleChangeBtn = page.locator('table tbody').locator('text=역할변경').first();
    await expect(roleChangeBtn).toBeVisible();
  });

  test('5-2. "역할변경" 클릭 시 모달이 열린다', async () => {
    const roleChangeBtn = page.locator('table tbody').locator('text=역할변경').first();
    await roleChangeBtn.click();
    await expect(page.locator('text=역할 변경').first()).toBeVisible({ timeout: 5000 });
  });

  test('5-3. 모달에 대상 정보가 표시된다', async () => {
    await expect(page.locator('text=대상:')).toBeVisible();
  });

  test('5-4. 모달에 "새 역할" select가 보인다', async () => {
    await expect(page.locator('text=새 역할')).toBeVisible();
  });

  test('5-5. "취소" 버튼으로 모달이 닫힌다', async () => {
    await page.getByRole('button', { name: '취소' }).click();
    // 모달이 닫힌 후 테이블이 다시 보여야 함
    await expect(page.locator('table tbody tr').first()).toBeVisible();
  });

  // ─── 6. 콘솔 에러 ────────────────────────────────────────────

  test('6-1. 사용자 관리 페이지에서 JS 에러가 없다', async ({ browser }) => {
    const authContext = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const authPage = await authContext.newPage();

    const errors: string[] = [];
    authPage.on('pageerror', (err) => {
      errors.push(err.message);
    });

    await authPage.goto('/super-admin/users');
    await authPage.waitForSelector('text=사용자 관리', { timeout: 15000 });
    await authPage.waitForTimeout(2000);

    expect(errors).toHaveLength(0);
    await authContext.close();
  });
});

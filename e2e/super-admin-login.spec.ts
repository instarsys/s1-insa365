import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import path from 'path';

const BASE_URL = 'http://localhost:3001';
const STORAGE_STATE_PATH = path.join(__dirname, '.super-admin-auth-state.json');

test.describe.serial('Super Admin 로그인 페이지 E2E 테스트', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    // 로그인 페이지는 미인증 상태로 테스트해야 하므로 storageState 없이 생성
    context = await browser.newContext({ storageState: undefined });
    page = await context.newPage();
    await page.goto('/super-admin/login');
    await page.waitForSelector('text=s1-insa365', { timeout: 15000 });
  });

  test.afterAll(async () => {
    await context.close();
  });

  // ─── 1. 페이지 렌더링 ──────────────────────────────────────

  test('1-1. "s1-insa365" 로고 텍스트가 보인다', async () => {
    await expect(page.locator('h1:text-is("s1-insa365")')).toBeVisible();
  });

  test('1-2. "시스템 관리 콘솔" 부제목이 보인다', async () => {
    await expect(page.locator('text=시스템 관리 콘솔')).toBeVisible();
  });

  test('1-3. "시스템 관리자 로그인" 제목이 보인다', async () => {
    await expect(page.locator('h2:text-is("시스템 관리자 로그인")')).toBeVisible();
  });

  test('1-4. 이메일 입력 필드가 보인다', async () => {
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute('placeholder', 'sysadmin@insa365.com');
  });

  test('1-5. 비밀번호 입력 필드가 보인다', async () => {
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute('placeholder', '비밀번호를 입력하세요');
  });

  test('1-6. "로그인" 버튼이 보인다', async () => {
    await expect(page.locator('button[type="submit"]:text-is("로그인")')).toBeVisible();
  });

  // ─── 2. 에러 처리 ─────────────────────────────────────────

  test('2-1. 잘못된 비밀번호 입력 시 에러 메시지가 표시된다', async () => {
    await page.locator('input[type="email"]').fill('sysadmin@insa365.com');
    await page.locator('input[type="password"]').fill('wrongpassword');
    await page.locator('button[type="submit"]').click();

    // 에러 메시지 대기
    await expect(page.locator('.bg-red-50')).toBeVisible({ timeout: 10000 });

    // 입력 필드 초기화
    await page.locator('input[type="email"]').fill('');
    await page.locator('input[type="password"]').fill('');
  });

  // ─── 3. 링크 ──────────────────────────────────────────────

  test('3-1. "일반 사용자" 링크가 /login으로 연결된다', async () => {
    const link = page.locator('a:text-is("여기")');
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/login');
  });

  // ─── 4. 실제 로그인 ───────────────────────────────────────

  test('4-1. 올바른 자격증명으로 로그인하면 대시보드로 이동한다', async ({ browser }) => {
    const loginContext = await browser.newContext({ storageState: undefined });
    const loginPage = await loginContext.newPage();
    await loginPage.goto('/super-admin/login');
    await loginPage.waitForSelector('text=s1-insa365', { timeout: 15000 });

    await loginPage.locator('input[type="email"]').fill('sysadmin@insa365.com');
    await loginPage.locator('input[type="password"]').fill('sysadmin123!');
    await loginPage.locator('button[type="submit"]').click();
    await loginPage.waitForURL('**/super-admin/dashboard', { timeout: 15000 });

    expect(loginPage.url()).toContain('/super-admin/dashboard');
    await loginContext.close();
  });

  // ─── 5. 콘솔 에러 ─────────────────────────────────────────

  test('5-1. 로그인 페이지에서 JS 에러가 없다', async ({ browser }) => {
    const freshContext = await browser.newContext({ storageState: undefined });
    const freshPage = await freshContext.newPage();

    const errors: string[] = [];
    freshPage.on('pageerror', (err) => {
      errors.push(err.message);
    });

    await freshPage.goto('/super-admin/login');
    await freshPage.waitForSelector('text=s1-insa365', { timeout: 15000 });
    await freshPage.waitForTimeout(2000);

    expect(errors).toHaveLength(0);
    await freshContext.close();
  });
});

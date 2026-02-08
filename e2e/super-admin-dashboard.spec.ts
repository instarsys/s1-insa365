import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import path from 'path';

const BASE_URL = 'http://localhost:3001';
const STORAGE_STATE_PATH = path.join(__dirname, '.super-admin-auth-state.json');

test.describe.serial('Super Admin 대시보드 E2E 테스트', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await page.goto('/super-admin/dashboard');
    await page.waitForSelector('text=시스템 대시보드', { timeout: 15000 });
  });

  test.afterAll(async () => {
    await context.close();
  });

  // ─── 1. 인증 및 접근 제어 ───────────────────────────────────

  test('1-1. 미인증 사용자는 /super-admin/login으로 리다이렉트된다', async ({ browser }) => {
    const freshContext = await browser.newContext({ storageState: undefined });
    const freshPage = await freshContext.newPage();
    await freshPage.goto('/super-admin/dashboard');
    await freshPage.waitForURL(/\/super-admin\/login/, { timeout: 10000 });
    expect(freshPage.url()).toContain('/super-admin/login');
    await freshContext.close();
  });

  // ─── 2. 페이지 헤더 ────────────────────────────────────────

  test('2-1. "시스템 대시보드" 제목이 보인다', async () => {
    await expect(page.getByRole('heading', { name: '시스템 대시보드' })).toBeVisible();
  });

  test('2-2. 부제목 "시스템 전체 현황을 모니터링합니다."가 보인다', async () => {
    await expect(page.locator('text=시스템 전체 현황을 모니터링합니다.')).toBeVisible();
  });

  // ─── 3. 통계 카드 ─────────────────────────────────────────

  test('3-1. "전체 테넌트(회사)" 카드가 보인다', async () => {
    await expect(page.locator('text=전체 테넌트(회사)')).toBeVisible();
  });

  test('3-2. "전체 사용자" 카드가 보인다', async () => {
    await expect(page.locator('text=전체 사용자')).toBeVisible();
  });

  test('3-3. "급여 확정" 카드가 보인다', async () => {
    await expect(page.locator('text=/\\d+월 급여 확정/')).toBeVisible();
  });

  test('3-4. "시스템 가동시간" 카드가 보인다', async () => {
    await expect(page.locator('text=시스템 가동시간')).toBeVisible();
  });

  // ─── 4. 급여 처리 현황 카드 ───────────────────────────────

  test('4-1. "급여 처리 현황" 카드가 보인다', async () => {
    await expect(page.locator('text=/급여 처리 현황/')).toBeVisible();
  });

  test('4-2. "확정 (CONFIRMED)" 행이 보인다', async () => {
    await expect(page.locator('text=확정 (CONFIRMED)')).toBeVisible();
  });

  test('4-3. "작성중 (DRAFT)" 행이 보인다', async () => {
    await expect(page.locator('text=작성중 (DRAFT)')).toBeVisible();
  });

  test('4-4. "지급완료 (PAID)" 행이 보인다', async () => {
    await expect(page.locator('text=지급완료 (PAID)')).toBeVisible();
  });

  // ─── 5. 시스템 정보 카드 ──────────────────────────────────

  test('5-1. "시스템 정보" 카드가 보인다', async () => {
    await expect(page.locator('h3:text-is("시스템 정보")')).toBeVisible();
  });

  test('5-2. "가동 시간" 행이 보인다', async () => {
    // 시스템 정보 카드 내의 "가동 시간" (통계 카드의 "시스템 가동시간"과 구별)
    await expect(page.locator('span:text-is("가동 시간")')).toBeVisible();
  });

  test('5-3. "마지막 확인" 행이 보인다', async () => {
    await expect(page.locator('text=마지막 확인')).toBeVisible();
  });

  // ─── 6. TopBar ────────────────────────────────────────────

  test('6-1. TopBar에 "s1-insa365" 로고가 보인다', async () => {
    await expect(page.locator('header').locator('text=s1-insa365')).toBeVisible();
  });

  test('6-2. TopBar에 "System Admin" 뱃지가 보인다', async () => {
    await expect(page.locator('header').locator('text=System Admin')).toBeVisible();
  });

  // ─── 7. 사이드바 ──────────────────────────────────────────

  test('7-1. 사이드바에 6개 메뉴가 보인다', async () => {
    const menuLabels = ['대시보드', '법정 파라미터', '감사 로그', '테넌트 관리', '사용자 관리', '플랜 관리'];
    for (const label of menuLabels) {
      await expect(page.getByRole('link', { name: label })).toBeVisible();
    }
  });

  test('7-2. 하단에 "System Admin Console" 텍스트가 보인다', async () => {
    await expect(page.locator('text=System Admin Console')).toBeVisible();
  });

  // ─── 8. 프로필 드롭다운 ───────────────────────────────────

  test('8-1. 프로필 아바타 클릭 시 드롭다운이 열린다', async () => {
    // SuperAdminTopBar: 이니셜 한 글자 버튼
    const avatarButton = page.locator('header button.rounded-full');
    await avatarButton.click();

    await expect(page.locator('text=sysadmin@insa365.com')).toBeVisible();
    await expect(page.locator('button:has-text("로그아웃")')).toBeVisible();

    // 드롭다운 닫기
    await page.keyboard.press('Escape');
  });

  // ─── 9. 콘솔 에러 ─────────────────────────────────────────

  test('9-1. 대시보드에서 JS 에러가 없다', async ({ browser }) => {
    const authContext = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const authPage = await authContext.newPage();

    const errors: string[] = [];
    authPage.on('pageerror', (err) => {
      errors.push(err.message);
    });

    await authPage.goto('/super-admin/dashboard');
    await authPage.waitForSelector('text=시스템 대시보드', { timeout: 15000 });
    await authPage.waitForTimeout(2000);

    expect(errors).toHaveLength(0);
    await authContext.close();
  });
});

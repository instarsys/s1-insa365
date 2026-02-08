import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import path from 'path';

const STORAGE_STATE_PATH = path.join(__dirname, '.super-admin-auth-state.json');

test.describe.serial('Super Admin 플랜 관리 E2E 테스트', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await page.goto('/super-admin/plans');
    await page.waitForSelector('text=플랜 관리', { timeout: 15000 });
  });

  test.afterAll(async () => {
    await context.close();
  });

  // ─── 1. 페이지 헤더 ──────────────────────────────────────────

  test('1-1. "플랜 관리" 제목이 보인다', async () => {
    await expect(page.getByRole('heading', { name: '플랜 관리' })).toBeVisible();
  });

  test('1-2. 부제목이 보인다', async () => {
    await expect(page.locator('text=SaaS 요금제를 관리하고 회사별 플랜 할당을 확인합니다.')).toBeVisible();
  });

  // ─── 2. 플랜 카드 ────────────────────────────────────────────

  test('2-1. Free 카드가 보인다', async () => {
    await expect(page.locator('h3:text-is("Free")')).toBeVisible();
  });

  test('2-2. Starter 카드가 보인다', async () => {
    await expect(page.locator('h3:text-is("Starter")')).toBeVisible();
  });

  test('2-3. Business 카드가 보인다', async () => {
    await expect(page.locator('h3:text-is("Business")')).toBeVisible();
  });

  test('2-4. Enterprise 카드가 보인다', async () => {
    await expect(page.locator('h3:text-is("Enterprise")')).toBeVisible();
  });

  // ─── 3. 가격 및 인원 ─────────────────────────────────────────

  test('3-1. Free 가격 "무료"가 표시된다', async () => {
    await expect(page.locator('text=무료')).toBeVisible();
  });

  test('3-2. Starter 가격이 표시된다', async () => {
    await expect(page.locator('text=₩49,000/월')).toBeVisible();
  });

  test('3-3. Business 가격이 표시된다', async () => {
    await expect(page.locator('text=₩99,000/월')).toBeVisible();
  });

  test('3-4. Enterprise 가격이 표시된다', async () => {
    await expect(page.locator('text=₩199,000/월')).toBeVisible();
  });

  test('3-5. "추천" 뱃지가 Business 카드에 표시된다', async () => {
    await expect(page.locator('text=추천')).toBeVisible();
  });

  test('3-6. 최대 인원 텍스트가 표시된다', async () => {
    await expect(page.locator('text=최대 5명')).toBeVisible();
    await expect(page.locator('text=최대 30명')).toBeVisible();
    await expect(page.locator('text=최대 100명')).toBeVisible();
    await expect(page.locator('text=최대 300명')).toBeVisible();
  });

  // ─── 4. 기능 목록 및 버튼 ────────────────────────────────────

  test('4-1. "플랜 선택" 버튼이 4개 보인다', async () => {
    const buttons = page.getByRole('button', { name: '플랜 선택' });
    await expect(buttons).toHaveCount(4);
  });

  test('4-2. 플랜 선택 클릭 시 "선택됨"으로 변경된다', async () => {
    const firstButton = page.getByRole('button', { name: '플랜 선택' }).first();
    await firstButton.click();
    await expect(page.getByRole('button', { name: '선택됨' })).toBeVisible();
  });

  // ─── 5. 하단 카드 ────────────────────────────────────────────

  test('5-1. "회사별 플랜 할당 현황" 카드가 보인다', async () => {
    await expect(page.locator('text=회사별 플랜 할당 현황')).toBeVisible();
  });

  test('5-2. 플랜 관리 안내 문구가 보인다', async () => {
    await expect(page.locator('text=플랜 관리 기능은 추후 업데이트 예정입니다.')).toBeVisible();
  });

  // ─── 6. 콘솔 에러 ────────────────────────────────────────────

  test('6-1. 플랜 관리 페이지에서 JS 에러가 없다', async ({ browser }) => {
    const authContext = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const authPage = await authContext.newPage();

    const errors: string[] = [];
    authPage.on('pageerror', (err) => {
      errors.push(err.message);
    });

    await authPage.goto('/super-admin/plans');
    await authPage.waitForSelector('text=플랜 관리', { timeout: 15000 });
    await authPage.waitForTimeout(2000);

    expect(errors).toHaveLength(0);
    await authContext.close();
  });
});

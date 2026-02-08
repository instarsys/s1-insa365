import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import path from 'path';

const STORAGE_STATE_PATH = path.join(__dirname, '.auth-state.json');

test.describe.serial('4대보험 현황 E2E 테스트', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await page.goto('/reports/insurance-status');
    // 보험 카드가 로딩될 때까지 대기 (테이블 없이 카드 구조)
    await page.waitForSelector('h3', { timeout: 20000 });
  });

  test.afterAll(async () => {
    await context.close();
  });

  // ═══════════════════════════════════════════════════════════════
  // 1. 페이지 헤더
  // ═══════════════════════════════════════════════════════════════

  test('1-1. 제목 "4대보험 현황"이 보인다', async () => {
    await expect(page.getByRole('heading', { name: '4대보험 현황', level: 1 })).toBeVisible();
  });

  test('1-2. 부제목이 보인다', async () => {
    await expect(page.locator('text=4대 사회보험 납부 현황을 조회합니다.')).toBeVisible();
  });

  // ═══════════════════════════════════════════════════════════════
  // 2. 기간 선택 필터
  // ═══════════════════════════════════════════════════════════════

  test('2-1. 연도 드롭다운에 2026년이 선택되어 있다', async () => {
    await expect(page.getByRole('combobox', { name: '연도' })).toHaveValue('2026');
  });

  test('2-2. 연도 드롭다운에 3개 옵션이 있다', async () => {
    const options = page.getByRole('combobox', { name: '연도' }).locator('option');
    const count = await options.count();
    expect(count).toBe(3);
  });

  test('2-3. 월 드롭다운에 현재 월이 선택되어 있다', async () => {
    const currentMonth = String(new Date().getMonth() + 1);
    await expect(page.getByRole('combobox', { name: '월' })).toHaveValue(currentMonth);
  });

  test('2-4. 월 드롭다운에 12개 옵션이 있다', async () => {
    const options = page.getByRole('combobox', { name: '월' }).locator('option');
    const count = await options.count();
    expect(count).toBe(12);
  });

  // ═══════════════════════════════════════════════════════════════
  // 3. 요약 통계 카드
  // ═══════════════════════════════════════════════════════════════

  test('3-1. "근로자 부담 합계" 라벨이 보인다', async () => {
    await expect(page.locator('text=근로자 부담 합계')).toBeVisible();
  });

  test('3-2. 근로자 부담 합계 값이 표시된다', async () => {
    const card = page.locator('text=근로자 부담 합계').locator('..');
    await expect(card.locator('text=0원')).toBeVisible();
  });

  test('3-3. "사업자 부담 합계" 라벨이 보인다', async () => {
    await expect(page.locator('text=사업자 부담 합계')).toBeVisible();
  });

  test('3-4. 사업자 부담 합계 값이 표시된다', async () => {
    const card = page.locator('text=사업자 부담 합계').locator('..');
    await expect(card.locator('text=0원')).toBeVisible();
  });

  test('3-5. "총 보험료" 라벨이 보인다', async () => {
    await expect(page.locator('text=총 보험료')).toBeVisible();
  });

  test('3-6. 총 보험료 값이 표시된다', async () => {
    const card = page.locator('text=총 보험료').locator('..');
    await expect(card.locator('text=0원')).toBeVisible();
  });

  // ═══════════════════════════════════════════════════════════════
  // 4. 보험 카드 4종
  // ═══════════════════════════════════════════════════════════════

  test('4-1. 국민연금 제목이 보인다', async () => {
    await expect(page.getByRole('heading', { name: '국민연금', level: 3 })).toBeVisible();
  });

  test('4-2. 국민연금 근로자 부담이 표시된다', async () => {
    const card = page.getByRole('heading', { name: '국민연금' }).locator('..');
    await expect(card.locator('text=근로자 부담').first()).toBeVisible();
  });

  test('4-3. 국민연금 사업자 부담이 표시된다', async () => {
    const card = page.getByRole('heading', { name: '국민연금' }).locator('..');
    await expect(card.locator('text=사업자 부담')).toBeVisible();
  });

  test('4-4. 국민연금 합계가 표시된다', async () => {
    const card = page.getByRole('heading', { name: '국민연금' }).locator('..');
    await expect(card.locator('text=합계').first()).toBeVisible();
  });

  test('4-5. 국민연금 가입자 수가 "0명"으로 표시된다', async () => {
    const card = page.getByRole('heading', { name: '국민연금' }).locator('..');
    await expect(card.locator('text=가입자 수')).toBeVisible();
    await expect(card.locator('text=0명')).toBeVisible();
  });

  test('4-6. 건강보험 제목이 보인다', async () => {
    await expect(page.getByRole('heading', { name: '건강보험', level: 3 })).toBeVisible();
  });

  test('4-7. 건강보험 가입자 수가 표시된다', async () => {
    const card = page.getByRole('heading', { name: '건강보험' }).locator('..');
    await expect(card.locator('text=가입자 수')).toBeVisible();
  });

  test('4-8. 장기요양보험 제목이 보인다', async () => {
    await expect(page.getByRole('heading', { name: '장기요양보험', level: 3 })).toBeVisible();
  });

  test('4-9. 장기요양보험에 가입자 수가 없다', async () => {
    const card = page.getByRole('heading', { name: '장기요양보험' }).locator('..');
    await expect(card.locator('text=가입자 수')).not.toBeVisible();
  });

  test('4-10. 고용보험 제목이 보인다', async () => {
    await expect(page.getByRole('heading', { name: '고용보험', level: 3 })).toBeVisible();
  });

  test('4-11. 고용보험에 사업자 부담이 없다', async () => {
    const card = page.getByRole('heading', { name: '고용보험' }).locator('..');
    await expect(card.locator('text=사업자 부담')).not.toBeVisible();
  });

  test('4-12. 고용보험 가입자 수가 표시된다', async () => {
    const card = page.getByRole('heading', { name: '고용보험' }).locator('..');
    await expect(card.locator('text=가입자 수')).toBeVisible();
  });

  // ═══════════════════════════════════════════════════════════════
  // 5. 콘솔 에러 검증
  // ═══════════════════════════════════════════════════════════════

  test('5-1. 4대보험 현황에서 JS 에러가 없다', async ({ browser }) => {
    const authContext = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const authPage = await authContext.newPage();

    const errors: string[] = [];
    authPage.on('pageerror', (err) => {
      errors.push(err.message);
    });

    await authPage.goto('/reports/insurance-status');
    await authPage.waitForSelector('h3', { timeout: 20000 });
    await authPage.waitForTimeout(2000);

    expect(errors).toHaveLength(0);
    await authContext.close();
  });
});

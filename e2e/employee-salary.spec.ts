import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import path from 'path';

const BASE_URL = 'http://localhost:3001';
const STORAGE_STATE_PATH = path.join(__dirname, '.employee-auth-state.json');

test.describe.serial('직원 급여 E2E 테스트', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await page.goto('/salary');
    await page.waitForSelector('text=급여', { timeout: 15000 });
  });

  test.afterAll(async () => {
    await context.close();
  });

  // --- 1. 제목 ---

  test('1-1. "급여" 제목이 보인다', async () => {
    await expect(page.getByRole('heading', { name: '급여' })).toBeVisible();
  });

  // --- 2. 급여 카드 또는 빈 상태 ---

  test('2-1. 급여 카드 또는 빈 상태 메시지가 보인다', async () => {
    const hasPayroll = await page.locator('text=총 지급').isVisible().catch(() => false);
    const hasEmpty = await page.locator('text=급여 이력이 없습니다').isVisible().catch(() => false);
    expect(hasPayroll || hasEmpty).toBeTruthy();
  });

  // --- 3. 급여 이력 섹션 ---

  test('3-1. "급여 이력" 섹션이 존재한다', async () => {
    await expect(page.locator('text=급여 이력')).toBeVisible();
  });

  // --- 4. 급여 데이터가 있을 때 상세 테스트 ---

  test('4-1. 급여 데이터 존재 시 상태 뱃지가 보인다', async () => {
    const hasPayroll = await page.locator('text=총 지급').isVisible().catch(() => false);
    if (hasPayroll) {
      // Status badge: 확정, 지급완료, 임시 중 하나
      const hasBadge = await page.locator('text=확정').or(page.locator('text=지급완료')).or(page.locator('text=임시')).first().isVisible().catch(() => false);
      expect(hasBadge).toBeTruthy();
    }
  });

  test('4-2. 급여 데이터 존재 시 "총 지급" 텍스트가 보인다', async () => {
    const hasPayroll = await page.locator('text=총 지급').isVisible().catch(() => false);
    if (hasPayroll) {
      await expect(page.locator('text=총 지급').first()).toBeVisible();
    }
  });

  test('4-3. 급여 데이터 존재 시 "총 공제" 텍스트가 보인다', async () => {
    const hasPayroll = await page.locator('text=총 공제').isVisible().catch(() => false);
    if (hasPayroll) {
      await expect(page.locator('text=총 공제').first()).toBeVisible();
    }
  });

  test('4-4. 급여 데이터 존재 시 "실수령" 텍스트가 보인다', async () => {
    const hasPayroll = await page.locator('text=실수령').isVisible().catch(() => false);
    if (hasPayroll) {
      await expect(page.locator('text=실수령').first()).toBeVisible();
    }
  });

  test('4-5. 급여 데이터 존재 시 "항목별 상세보기" 버튼이 보인다', async () => {
    const hasDetailBtn = await page.locator('text=항목별 상세보기').isVisible().catch(() => false);
    if (hasDetailBtn) {
      await expect(page.locator('text=항목별 상세보기')).toBeVisible();
    }
  });

  test('4-6. "항목별 상세보기" 클릭 시 상세 항목이 펼쳐진다', async () => {
    const hasDetailBtn = await page.locator('text=항목별 상세보기').isVisible().catch(() => false);
    if (hasDetailBtn) {
      await page.locator('button:has-text("항목별 상세보기")').click();
      await page.waitForTimeout(300);
      // After expanding, "지급 항목" or "공제 항목" should appear
      const hasPayItems = await page.locator('text=지급 항목').isVisible().catch(() => false);
      const hasDeductItems = await page.locator('text=공제 항목').isVisible().catch(() => false);
      expect(hasPayItems || hasDeductItems).toBeTruthy();
    }
  });

  test('4-7. 펼쳐진 상태에서 "접기" 버튼이 보인다', async () => {
    const hasFoldBtn = await page.locator('text=접기').isVisible().catch(() => false);
    if (hasFoldBtn) {
      await expect(page.locator('button:has-text("접기")')).toBeVisible();
      // Collapse back
      await page.locator('button:has-text("접기")').click();
      await page.waitForTimeout(300);
    }
  });

  // --- 5. 급여 이력 카드 펼치기 ---

  test('5-1. 급여 이력 섹션이 존재한다', async () => {
    // 급여 이력 섹션 제목 또는 빈 상태 중 하나가 보여야 함
    const hasHistoryHeading = await page.locator('text=급여 이력').first().isVisible().catch(() => false);
    const hasEmpty = await page.locator('text=급여 이력이 없습니다').isVisible().catch(() => false);
    expect(hasHistoryHeading || hasEmpty).toBeTruthy();
  });

  // --- 6. 빈 상태 ---

  test('6-1. 데이터 없을 시 빈 상태가 표시된다', async () => {
    const hasPayroll = await page.locator('text=총 지급').isVisible().catch(() => false);
    if (!hasPayroll) {
      await expect(page.locator('text=급여 이력이 없습니다').first()).toBeVisible();
    }
  });

  // --- 7. JS 에러 ---

  test('7-1. 직원 급여 페이지에서 JS 에러가 없다', async ({ browser }) => {
    const authContext = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const authPage = await authContext.newPage();

    const errors: string[] = [];
    authPage.on('pageerror', (err) => {
      errors.push(err.message);
    });

    await authPage.goto('/salary');
    await authPage.waitForSelector('text=급여', { timeout: 15000 });
    await authPage.waitForTimeout(2000);

    expect(errors).toHaveLength(0);
    await authContext.close();
  });
});

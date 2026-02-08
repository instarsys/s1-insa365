import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import path from 'path';

const BASE_URL = 'http://localhost:3001';
const STORAGE_STATE_PATH = path.join(__dirname, '.employee-auth-state.json');

test.describe.serial('직원 근태 E2E 테스트', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await page.goto('/e/attendance');
    await page.waitForSelector('text=근태', { timeout: 15000 });
  });

  test.afterAll(async () => {
    await context.close();
  });

  // --- 1. 제목 ---

  test('1-1. "근태" 제목이 보인다', async () => {
    await expect(page.getByRole('heading', { name: '근태' })).toBeVisible();
  });

  // --- 2. 탭 ---

  test('2-1. "주간" 탭이 존재한다', async () => {
    await expect(page.locator('text=주간')).toBeVisible();
  });

  test('2-2. "월간" 탭이 존재한다', async () => {
    await expect(page.locator('text=월간')).toBeVisible();
  });

  test('2-3. 주간 탭이 기본 활성 상태이다', async () => {
    // Weekly view shows "이번 주 총 근무"
    await expect(page.locator('text=이번 주 총 근무')).toBeVisible();
  });

  // --- 3. 주간 뷰 ---

  test('3-1. 요일 라벨이 보인다 (월~일)', async () => {
    for (const day of ['월', '화', '수', '목', '금']) {
      await expect(page.locator(`span:text-is("${day}")`)).toBeVisible();
    }
  });

  test('3-2. "이번 주 총 근무" 텍스트가 보인다', async () => {
    await expect(page.locator('text=이번 주 총 근무')).toBeVisible();
  });

  // --- 4. 월간 탭 클릭 ---

  test('4-1. "월간" 탭 클릭 시 월간 뷰가 보인다', async () => {
    await page.locator('button:has-text("월간")').click();
    await page.waitForTimeout(500);
    const today = new Date();
    const yearMonthText = `${today.getFullYear()}년 ${today.getMonth() + 1}월`;
    await expect(page.locator(`text=${yearMonthText}`)).toBeVisible();
  });

  test('4-2. 월 제목이 "년 월" 형식으로 표시된다', async () => {
    const heading = page.locator('p.text-sm.font-semibold');
    const text = await heading.textContent();
    expect(text).toMatch(/\d{4}년 \d{1,2}월/);
  });

  // --- 5. 월간 뷰 상세 ---

  test('5-1. 달력 요일 헤더가 보인다 (일~토)', async () => {
    for (const day of ['일', '월', '화', '수', '목', '금', '토']) {
      await expect(page.locator(`span:text-is("${day}")`).first()).toBeVisible();
    }
  });

  test('5-2. 범례에 "정상출근" 텍스트가 보인다', async () => {
    await expect(page.locator('text=정상출근')).toBeVisible();
  });

  test('5-3. 범례에 "결근" 텍스트가 보인다', async () => {
    await expect(page.locator('span:text-is("결근")')).toBeVisible();
  });

  test('5-4. "이번 달 근무" 텍스트가 보인다', async () => {
    await expect(page.locator('text=이번 달 근무')).toBeVisible();
  });

  // --- 6. JS 에러 ---

  test('6-1. 직원 근태 페이지에서 JS 에러가 없다', async ({ browser }) => {
    const authContext = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const authPage = await authContext.newPage();

    const errors: string[] = [];
    authPage.on('pageerror', (err) => {
      errors.push(err.message);
    });

    await authPage.goto('/e/attendance');
    await authPage.waitForSelector('text=근태', { timeout: 15000 });
    await authPage.waitForTimeout(2000);

    expect(errors).toHaveLength(0);
    await authContext.close();
  });
});

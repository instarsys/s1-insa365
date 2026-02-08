import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import path from 'path';

const BASE_URL = 'http://localhost:3001';
const STORAGE_STATE_PATH = path.join(__dirname, '.employee-auth-state.json');

test.describe.serial('직원 홈 E2E 테스트', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      storageState: STORAGE_STATE_PATH,
      geolocation: { latitude: 37.5665, longitude: 126.978 },
      permissions: ['geolocation'],
    });
    page = await context.newPage();
    await page.goto('/home');
    await page.waitForSelector('text=님', { timeout: 15000 });
  });

  test.afterAll(async () => {
    await context.close();
  });

  // --- 1. MobileTopBar ---

  test('1-1. "s1-insa365" 로고가 보인다', async () => {
    await expect(page.locator('header').locator('text=s1-insa365')).toBeVisible();
  });

  // --- 2. 인사말 ---

  test('2-1. 인사말에 "님" 텍스트가 포함된다', async () => {
    await expect(page.locator('text=님')).toBeVisible();
  });

  // --- 3. 시계 ---

  test('3-1. 시계가 HH:MM:SS 형식으로 표시된다', async () => {
    const timeText = page.locator('p.text-3xl');
    await expect(timeText).toBeVisible();
    const text = await timeText.textContent();
    expect(text).toMatch(/\d{2}:\d{2}:\d{2}/);
  });

  // --- 4. 출퇴근 버튼 ---

  test('4-1. 출근하기 또는 퇴근하기 버튼이 보인다', async () => {
    const clockButton = page.locator('button.rounded-full.h-28');
    await expect(clockButton).toBeVisible();
    const text = await clockButton.textContent();
    expect(text).toMatch(/출근하기|퇴근하기/);
  });

  // --- 5. GPS ---

  test('5-1. GPS 상태 텍스트가 보인다', async () => {
    await expect(page.locator('text=GPS')).toBeVisible();
  });

  // --- 6. 오늘 근무 카드 ---

  test('6-1. "출근" 라벨이 보인다', async () => {
    await expect(page.locator('p:text-is("출근")')).toBeVisible();
  });

  test('6-2. "퇴근" 라벨이 보인다', async () => {
    await expect(page.locator('p:text-is("퇴근")')).toBeVisible();
  });

  test('6-3. "근무시간" 라벨이 보인다', async () => {
    await expect(page.locator('p:text-is("근무시간")')).toBeVisible();
  });

  // --- 7. 다음 급여일 ---

  test('7-1. "다음 급여일" 텍스트가 보인다', async () => {
    await expect(page.locator('text=다음 급여일')).toBeVisible();
  });

  // --- 8. 최근 알림 ---

  test('8-1. "최근 알림" 섹션이 보인다', async () => {
    await expect(page.locator('text=최근 알림')).toBeVisible();
  });

  test('8-2. "전체보기" 버튼이 보인다', async () => {
    await expect(page.locator('button:has-text("전체보기")')).toBeVisible();
  });

  // --- 9. JS 에러 ---

  test('9-1. 직원 홈에서 JS 에러가 없다', async ({ browser }) => {
    const authContext = await browser.newContext({
      storageState: STORAGE_STATE_PATH,
      geolocation: { latitude: 37.5665, longitude: 126.978 },
      permissions: ['geolocation'],
    });
    const authPage = await authContext.newPage();

    const errors: string[] = [];
    authPage.on('pageerror', (err) => {
      // 실시간 시계로 인한 hydration mismatch는 무시 (Date.now() 차이)
      if (err.message.includes('Hydration')) return;
      errors.push(err.message);
    });

    await authPage.goto('/home');
    await authPage.waitForSelector('text=님', { timeout: 15000 });
    await authPage.waitForTimeout(2000);

    expect(errors).toHaveLength(0);
    await authContext.close();
  });
});

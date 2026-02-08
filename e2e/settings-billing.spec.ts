import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import path from 'path';

const STORAGE_STATE_PATH = path.join(__dirname, '.auth-state.json');

test.describe.serial('플랜/결제 E2E 테스트', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await page.goto('/settings/billing');
    await page.waitForSelector('main h1', { timeout: 10000 });
  });

  test.afterAll(async () => {
    await context.close();
  });

  // ═══════════════════════════════════════════════════════════════
  // 1. 페이지 헤더
  // ═══════════════════════════════════════════════════════════════

  test('1-1. 제목 "플랜/결제"가 보인다', async () => {
    await expect(page.getByRole('heading', { name: '플랜/결제', level: 1 })).toBeVisible();
  });

  test('1-2. 부제목이 보인다', async () => {
    await expect(page.locator('text=구독 플랜과 결제 정보를 관리합니다.')).toBeVisible();
  });

  // ═══════════════════════════════════════════════════════════════
  // 2. 현재 플랜 카드
  // ═══════════════════════════════════════════════════════════════

  test('2-1. 섹션 제목 "현재 플랜"이 보인다', async () => {
    await expect(page.getByRole('heading', { name: '현재 플랜', level: 3 })).toBeVisible();
  });

  test('2-2. "무료 체험" 뱃지가 보인다', async () => {
    await expect(page.getByText('무료 체험', { exact: true })).toBeVisible();
  });

  test('2-3. 플랜명 "Free Trial"이 보인다', async () => {
    await expect(page.locator('text=Free Trial')).toBeVisible();
  });

  test('2-4. "30일 무료 체험 중" 설명이 보인다', async () => {
    await expect(page.locator('text=30일 무료 체험 중')).toBeVisible();
  });

  test('2-5. 직원 수 제한 라벨과 값 "50명"이 보인다', async () => {
    await expect(page.locator('text=직원 수 제한')).toBeVisible();
    await expect(page.locator('text=50명')).toBeVisible();
  });

  test('2-6. 남은 기간 라벨과 값 "30일"이 보인다', async () => {
    await expect(page.locator('text=남은 기간')).toBeVisible();
    await expect(page.locator('text=30일').first()).toBeVisible();
  });

  test('2-7. 업그레이드 버튼이 보인다 (disabled)', async () => {
    const btn = page.getByRole('button', { name: '업그레이드 (Phase 1.5 예정)' });
    await expect(btn).toBeVisible();
    await expect(btn).toBeDisabled();
  });

  // ═══════════════════════════════════════════════════════════════
  // 3. 사용 현황 카드
  // ═══════════════════════════════════════════════════════════════

  test('3-1. 섹션 제목 "사용 현황"이 보인다', async () => {
    await expect(page.getByRole('heading', { name: '사용 현황', level: 3 })).toBeVisible();
  });

  test('3-2. 직원 수 "0 / 50"이 보인다', async () => {
    await expect(page.locator('text=직원 수').first()).toBeVisible();
    await expect(page.locator('text=0 / 50')).toBeVisible();
  });

  test('3-3. 급여 실행 횟수 "0 / 무제한"이 보인다', async () => {
    await expect(page.locator('text=급여 실행 횟수')).toBeVisible();
    await expect(page.locator('text=0 / 무제한')).toBeVisible();
  });

  test('3-4. 저장 용량 "0 MB / 1 GB"가 보인다', async () => {
    await expect(page.locator('text=저장 용량')).toBeVisible();
    await expect(page.locator('text=0 MB / 1 GB')).toBeVisible();
  });

  test('3-5. 프로그레스 바 3개가 보인다', async () => {
    const progressBars = page.locator('.h-2.rounded-full.bg-gray-100');
    const count = await progressBars.count();
    expect(count).toBe(3);
  });

  // ═══════════════════════════════════════════════════════════════
  // 4. 결제 수단 카드
  // ═══════════════════════════════════════════════════════════════

  test('4-1. 섹션 제목 "결제 수단"이 보인다', async () => {
    await expect(page.getByRole('heading', { name: '결제 수단', level: 3 })).toBeVisible();
  });

  test('4-2. 플레이스홀더 메시지가 보인다', async () => {
    await expect(page.locator('text=결제 시스템은 Phase 1.5에서 제공됩니다.')).toBeVisible();
  });

  test('4-3. "토스페이먼츠 연동 예정" 부가 설명이 보인다', async () => {
    await expect(page.locator('text=토스페이먼츠 연동 예정')).toBeVisible();
  });

  // ═══════════════════════════════════════════════════════════════
  // 5. 콘솔 에러 검증
  // ═══════════════════════════════════════════════════════════════

  test('5-1. 플랜/결제에서 JS 에러가 없다', async ({ browser }) => {
    const authContext = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const authPage = await authContext.newPage();

    const errors: string[] = [];
    authPage.on('pageerror', (err) => {
      errors.push(err.message);
    });

    await authPage.goto('/settings/billing');
    await authPage.waitForSelector('main h1', { timeout: 10000 });
    await authPage.waitForTimeout(2000);

    expect(errors).toHaveLength(0);
    await authContext.close();
  });
});

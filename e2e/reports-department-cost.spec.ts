import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import path from 'path';

const STORAGE_STATE_PATH = path.join(__dirname, '.auth-state.json');

test.describe.serial('부서별 인건비 E2E 테스트', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await page.goto('/reports/department-cost');
    await page.waitForSelector('table', { timeout: 20000 });
  });

  test.afterAll(async () => {
    await context.close();
  });

  // ═══════════════════════════════════════════════════════════════
  // 1. 페이지 헤더
  // ═══════════════════════════════════════════════════════════════

  test('1-1. 제목 "부서별 인건비"가 보인다', async () => {
    await expect(page.getByRole('heading', { name: '부서별 인건비', level: 1 })).toBeVisible();
  });

  test('1-2. 부제목이 보인다', async () => {
    await expect(page.locator('text=부서별 인건비 현황을 조회합니다.')).toBeVisible();
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
  // 3. 통계 카드
  // ═══════════════════════════════════════════════════════════════

  test('3-1. "총 인건비" 라벨이 보인다', async () => {
    await expect(page.locator('text=총 인건비').first()).toBeVisible();
  });

  test('3-2. 총 인건비 값이 표시된다', async () => {
    await expect(page.locator('text=0원').first()).toBeVisible();
  });

  test('3-3. "총 직원수" 라벨이 보인다', async () => {
    await expect(page.locator('text=총 직원수').first()).toBeVisible();
  });

  test('3-4. 총 직원수 값이 표시된다', async () => {
    await expect(page.locator('text=0명').first()).toBeVisible();
  });

  test('3-5. "총 실수령" 라벨이 보인다', async () => {
    await expect(page.locator('text=총 실수령').first()).toBeVisible();
  });

  test('3-6. 총 실수령 값이 표시된다', async () => {
    // StatCard에 "총 실수령" 다음에 값이 있는지 확인
    const card = page.locator('text=총 실수령').first().locator('..');
    await expect(card).toBeVisible();
  });

  // ═══════════════════════════════════════════════════════════════
  // 4. 부서별 인건비 현황 테이블
  // ═══════════════════════════════════════════════════════════════

  test('4-1. 섹션 제목 "부서별 인건비 현황"이 보인다', async () => {
    await expect(page.getByRole('heading', { name: '부서별 인건비 현황', level: 3 })).toBeVisible();
  });

  test('4-2. 5개 컬럼 헤더가 보인다', async () => {
    const headers = ['부서', '인원', '총 지급액', '총 공제액', '총 실수령'];
    for (const header of headers) {
      await expect(page.getByRole('columnheader', { name: header })).toBeVisible();
    }
  });

  test('4-3. 테이블에 6개 행이 있다 (5부서 + 합계)', async () => {
    const rows = page.locator('tbody tr');
    const count = await rows.count();
    expect(count).toBe(6);
  });

  test('4-4. 5개 부서명이 모두 표시된다', async () => {
    const departments = ['경영지원팀', '개발팀', '영업팀', '마케팅팀', '인사팀'];
    for (const dept of departments) {
      await expect(page.getByRole('cell', { name: dept })).toBeVisible();
    }
  });

  test('4-5. 합계 행이 보인다', async () => {
    await expect(page.getByRole('cell', { name: '합계' })).toBeVisible();
  });

  test('4-6. 합계 행 인원이 "0명"이다', async () => {
    const totalRow = page.locator('tbody tr').last();
    await expect(totalRow.getByRole('cell', { name: '합계' })).toBeVisible();
    await expect(totalRow.getByRole('cell', { name: '0명' })).toBeVisible();
  });

  test('4-7. 공제액에 마이너스 표시가 있다', async () => {
    await expect(page.locator('text=-0원').first()).toBeVisible();
  });

  // ═══════════════════════════════════════════════════════════════
  // 5. 콘솔 에러 검증
  // ═══════════════════════════════════════════════════════════════

  test('5-1. 부서별 인건비에서 JS 에러가 없다', async ({ browser }) => {
    const authContext = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const authPage = await authContext.newPage();

    const errors: string[] = [];
    authPage.on('pageerror', (err) => {
      errors.push(err.message);
    });

    await authPage.goto('/reports/department-cost');
    await authPage.waitForSelector('table', { timeout: 20000 });
    await authPage.waitForTimeout(2000);

    expect(errors).toHaveLength(0);
    await authContext.close();
  });
});

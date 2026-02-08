import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import path from 'path';

const STORAGE_STATE_PATH = path.join(__dirname, '.auth-state.json');

test.describe.serial('근태 리포트 E2E 테스트', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await page.goto('/reports/attendance');
    await page.waitForSelector('table', { timeout: 20000 });
  });

  test.afterAll(async () => {
    await context.close();
  });

  // ═══════════════════════════════════════════════════════════════
  // 1. 페이지 헤더
  // ═══════════════════════════════════════════════════════════════

  test('1-1. 제목 "근태 리포트"가 보인다', async () => {
    await expect(page.getByRole('heading', { name: '근태 리포트', level: 1 })).toBeVisible();
  });

  test('1-2. 부제목이 보인다', async () => {
    await expect(page.locator('text=근태 관련 리포트를 조회합니다.')).toBeVisible();
  });

  // ═══════════════════════════════════════════════════════════════
  // 2. 기간 선택 필터
  // ═══════════════════════════════════════════════════════════════

  test('2-1. 시작 연도 드롭다운에 2026년이 선택되어 있다', async () => {
    await expect(page.getByRole('combobox', { name: '시작 연도' })).toHaveValue('2026');
  });

  test('2-2. 시작 연도 드롭다운에 3개 옵션이 있다', async () => {
    const options = page.getByRole('combobox', { name: '시작 연도' }).locator('option');
    const count = await options.count();
    expect(count).toBe(3);
  });

  test('2-3. 시작 월 드롭다운에 1월이 선택되어 있다', async () => {
    await expect(page.getByRole('combobox', { name: '시작 월' })).toHaveValue('1');
  });

  test('2-4. 시작 월 드롭다운에 12개 옵션이 있다', async () => {
    const options = page.getByRole('combobox', { name: '시작 월' }).locator('option');
    const count = await options.count();
    expect(count).toBe(12);
  });

  test('2-5. "~" 구분자가 보인다', async () => {
    await expect(page.locator('text=~')).toBeVisible();
  });

  test('2-6. 종료 연도 드롭다운에 2026년이 선택되어 있다', async () => {
    await expect(page.getByRole('combobox', { name: '종료 연도' })).toHaveValue('2026');
  });

  test('2-7. 종료 월 드롭다운에 12월이 선택되어 있다', async () => {
    await expect(page.getByRole('combobox', { name: '종료 월' })).toHaveValue('12');
  });

  // ═══════════════════════════════════════════════════════════════
  // 3. 통계 카드
  // ═══════════════════════════════════════════════════════════════

  test('3-1. "평균 근무시간" 라벨이 보인다', async () => {
    await expect(page.locator('text=평균 근무시간').first()).toBeVisible();
  });

  test('3-2. 평균 근무시간 값에 "8시간"이 표시된다', async () => {
    await expect(page.locator('text=8시간').first()).toBeVisible();
  });

  test('3-3. "평균 초과근무" 라벨이 보인다', async () => {
    await expect(page.locator('text=평균 초과근무').first()).toBeVisible();
  });

  test('3-4. 평균 초과근무 값에 "0.3시간"이 표시된다', async () => {
    await expect(page.locator('text=0.3시간').first()).toBeVisible();
  });

  test('3-5. "평균 결근율" 라벨이 보인다', async () => {
    await expect(page.locator('text=평균 결근율')).toBeVisible();
  });

  test('3-6. 평균 결근율 값에 "0%"가 표시된다', async () => {
    await expect(page.locator('text=0%').first()).toBeVisible();
  });

  // ═══════════════════════════════════════════════════════════════
  // 4. 부서별 근태 현황 테이블
  // ═══════════════════════════════════════════════════════════════

  test('4-1. 섹션 제목 "부서별 근태 현황"이 보인다', async () => {
    await expect(page.getByRole('heading', { name: '부서별 근태 현황', level: 3 })).toBeVisible();
  });

  test('4-2. 6개 컬럼 헤더가 보인다', async () => {
    const headers = ['부서', '인원', '평균 근무시간', '평균 초과근무', '결근율', '지각 건수'];
    for (const header of headers) {
      await expect(page.getByRole('columnheader', { name: header })).toBeVisible();
    }
  });

  test('4-3. 테이블에 5개 부서 행이 있다', async () => {
    const rows = page.locator('tbody tr');
    const count = await rows.count();
    expect(count).toBe(5);
  });

  test('4-4. 첫 번째 행 부서명이 "경영지원팀"이다', async () => {
    await expect(page.locator('tbody tr').first().getByRole('cell', { name: '경영지원팀' })).toBeVisible();
  });

  test('4-5. 첫 번째 행 인원이 "11명"이다', async () => {
    await expect(page.locator('tbody tr').first().getByRole('cell', { name: '11명' })).toBeVisible();
  });

  test('4-6. 첫 번째 행 평균 근무시간이 "8시간"이다', async () => {
    await expect(page.locator('tbody tr').first().getByRole('cell', { name: '8시간' })).toBeVisible();
  });

  test('4-7. 첫 번째 행 평균 초과근무가 "0.4시간"이다', async () => {
    await expect(page.locator('tbody tr').first().getByRole('cell', { name: '0.4시간' })).toBeVisible();
  });

  test('4-8. 첫 번째 행 결근율이 "0%"이다', async () => {
    await expect(page.locator('tbody tr').first().getByRole('cell', { name: '0%' })).toBeVisible();
  });

  test('4-9. 첫 번째 행 지각 건수가 "20건"이다', async () => {
    await expect(page.locator('tbody tr').first().getByRole('cell', { name: '20건' })).toBeVisible();
  });

  test('4-10. 마지막 행 부서명이 "인사팀"이다', async () => {
    await expect(page.locator('tbody tr').last().getByRole('cell', { name: '인사팀' })).toBeVisible();
  });

  test('4-11. 마지막 행 인원이 "8명"이다', async () => {
    await expect(page.locator('tbody tr').last().getByRole('cell', { name: '8명' })).toBeVisible();
  });

  // ═══════════════════════════════════════════════════════════════
  // 5. 콘솔 에러 검증
  // ═══════════════════════════════════════════════════════════════

  test('5-1. 근태 리포트에서 JS 에러가 없다', async ({ browser }) => {
    const authContext = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const authPage = await authContext.newPage();

    const errors: string[] = [];
    authPage.on('pageerror', (err) => {
      errors.push(err.message);
    });

    await authPage.goto('/reports/attendance');
    await authPage.waitForSelector('table', { timeout: 30000 });
    await authPage.waitForTimeout(2000);

    expect(errors).toHaveLength(0);
    await authContext.close();
  });
});

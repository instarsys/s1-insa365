import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import path from 'path';

const STORAGE_STATE_PATH = path.join(__dirname, '.auth-state.json');

test.describe.serial('급여 리포트 E2E 테스트', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await page.goto('/reports/payroll');
    await page.waitForSelector('table', { timeout: 20000 });
  });

  test.afterAll(async () => {
    await context.close();
  });

  // ═══════════════════════════════════════════════════════════════
  // 1. 페이지 헤더
  // ═══════════════════════════════════════════════════════════════

  test('1-1. 제목 "급여 리포트"가 보인다', async () => {
    await expect(page.getByRole('heading', { name: '급여 리포트', level: 1 })).toBeVisible();
  });

  test('1-2. 부제목이 보인다', async () => {
    await expect(page.locator('text=급여 관련 리포트를 조회합니다.')).toBeVisible();
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

  test('3-1. "월 평균 인건비" 라벨이 보인다', async () => {
    await expect(page.locator('text=월 평균 인건비')).toBeVisible();
  });

  test('3-2. 월 평균 인건비 값에 "원" 단위가 포함된다', async () => {
    await expect(page.locator('text=/[\\d,]+원/').first()).toBeVisible();
  });

  test('3-3. "평균 직원수" 라벨이 보인다', async () => {
    await expect(page.locator('text=평균 직원수')).toBeVisible();
  });

  test('3-4. "총 인건비" 라벨이 보인다', async () => {
    await expect(page.locator('text=총 인건비')).toBeVisible();
  });

  test('3-5. 총 인건비 값에 "원" 단위가 포함된다', async () => {
    // 총 인건비 카드의 값 확인
    const totalCostCard = page.locator('text=총 인건비').locator('..');
    await expect(totalCostCard.locator('text=/[\\d,]+원/')).toBeVisible();
  });

  // ═══════════════════════════════════════════════════════════════
  // 4. 월별 급여 추이 테이블
  // ═══════════════════════════════════════════════════════════════

  test('4-1. 섹션 제목 "월별 급여 추이"가 보인다', async () => {
    await expect(page.getByRole('heading', { name: '월별 급여 추이', level: 3 })).toBeVisible();
  });

  test('4-2. 5개 컬럼 헤더가 보인다', async () => {
    const headers = ['기간', '직원수', '총 지급액', '총 실수령', '전월 대비'];
    for (const header of headers) {
      await expect(page.getByRole('columnheader', { name: header })).toBeVisible();
    }
  });

  test('4-3. 테이블에 12개 행이 있다', async () => {
    const rows = page.locator('tbody tr');
    const count = await rows.count();
    expect(count).toBe(12);
  });

  test('4-4. 첫 번째 행이 "2026년 1월"이다', async () => {
    await expect(page.locator('tbody tr').first().getByRole('cell', { name: '2026년 1월' })).toBeVisible();
  });

  test('4-5. 첫 번째 행에 "50명"이 표시된다', async () => {
    await expect(page.locator('tbody tr').first().getByRole('cell', { name: '50명' })).toBeVisible();
  });

  test('4-6. 첫 번째 행에 "205,750,000원" 총 지급액이 표시된다', async () => {
    await expect(page.locator('tbody tr').first().getByRole('cell', { name: '205,750,000원' })).toBeVisible();
  });

  test('4-7. 첫 번째 행에 "180,108,997원" 총 실수령이 표시된다', async () => {
    await expect(page.locator('tbody tr').first().getByRole('cell', { name: '180,108,997원' })).toBeVisible();
  });

  test('4-8. 두 번째 행에 전월 대비 "-100%"가 표시된다', async () => {
    await expect(page.locator('tbody tr').nth(1).locator('text=-100%')).toBeVisible();
  });

  test('4-9. 마지막 행이 "2026년 12월"이다', async () => {
    await expect(page.locator('tbody tr').last().getByRole('cell', { name: '2026년 12월' })).toBeVisible();
  });

  // ═══════════════════════════════════════════════════════════════
  // 5. 콘솔 에러 검증
  // ═══════════════════════════════════════════════════════════════

  test('5-1. 급여 리포트에서 JS 에러가 없다', async ({ browser }) => {
    const authContext = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const authPage = await authContext.newPage();

    const errors: string[] = [];
    authPage.on('pageerror', (err) => {
      errors.push(err.message);
    });

    await authPage.goto('/reports/payroll');
    await authPage.waitForSelector('table', { timeout: 20000 });
    await authPage.waitForTimeout(2000);

    expect(errors).toHaveLength(0);
    await authContext.close();
  });
});

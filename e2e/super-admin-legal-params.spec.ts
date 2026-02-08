import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import path from 'path';

const STORAGE_STATE_PATH = path.join(__dirname, '.super-admin-auth-state.json');

test.describe.serial('Super Admin 법정 파라미터 E2E 테스트', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await page.goto('/super-admin/legal-params');
    await page.waitForSelector('text=법정 파라미터', { timeout: 15000 });
  });

  test.afterAll(async () => {
    await context.close();
  });

  // ─── 1. 페이지 헤더 ──────────────────────────────────────────

  test('1-1. "법정 파라미터" 제목이 보인다', async () => {
    await expect(page.getByRole('heading', { name: '법정 파라미터' })).toBeVisible();
  });

  test('1-2. 부제목이 보인다', async () => {
    await expect(page.locator('text=보험요율, 세율, 최저임금 등 법정 파라미터를 관리합니다.')).toBeVisible();
  });

  // ─── 2. 탭 네비게이션 ────────────────────────────────────────

  test('2-1. 5개 탭이 모두 보인다', async () => {
    const tabs = ['보험요율', '간이세액표', '비과세한도', '최저임금', '법정상수'];
    for (const tab of tabs) {
      await expect(page.locator(`text=${tab}`).first()).toBeVisible();
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // 탭 1: 보험요율 (기본 활성 탭)
  // ═══════════════════════════════════════════════════════════════

  test('3-1. 보험요율 탭이 기본 활성 상태이다', async () => {
    // 보험요율 탭의 테이블이 보여야 함
    await expect(page.getByRole('columnheader', { name: '유형' })).toBeVisible({ timeout: 10000 });
  });

  test('3-2. "추가" 버튼이 보인다', async () => {
    await expect(page.getByRole('button', { name: /추가/ })).toBeVisible();
  });

  test('3-3. 보험요율 테이블 헤더가 보인다', async () => {
    const headers = ['유형', '근로자요율(%)', '사업자요율(%)', '하한', '상한', '적용시작', '적용종료'];
    for (const header of headers) {
      await expect(page.getByRole('columnheader', { name: header })).toBeVisible();
    }
  });

  test('3-4. 보험요율 데이터 행이 보인다', async () => {
    const rows = page.locator('table tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 10000 });
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('3-5. 보험 유형 라벨이 표시된다', async () => {
    const types = page.locator('table tbody').locator('text=/국민연금|건강보험|장기요양|고용보험/');
    const count = await types.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('3-6. "추가" 버튼 클릭 시 모달이 열린다', async () => {
    await page.getByRole('button', { name: /추가/ }).click();
    await expect(page.locator('text=보험요율 추가')).toBeVisible({ timeout: 5000 });
  });

  test('3-7. 보험요율 모달에 필드가 보인다', async () => {
    await expect(page.getByLabel('유형')).toBeVisible();
    await expect(page.getByLabel('근로자요율')).toBeVisible();
    await expect(page.getByLabel('사업자요율')).toBeVisible();
  });

  test('3-8. 모달 "취소" 버튼으로 닫힌다', async () => {
    await page.getByRole('button', { name: '취소' }).click();
    // 모달이 닫힌 후 테이블이 보여야 함
    await expect(page.getByRole('columnheader', { name: '유형' })).toBeVisible();
  });

  // ═══════════════════════════════════════════════════════════════
  // 탭 2: 간이세액표
  // ═══════════════════════════════════════════════════════════════

  test('4-1. 간이세액표 탭 클릭으로 전환된다', async () => {
    await page.getByRole('button', { name: '간이세액표', exact: true }).click();
    // 간이세액표 컨텐츠가 로드될 때까지 대기
    await page.waitForTimeout(1000);
  });

  test('4-2. 간이세액표 테이블 헤더가 보인다', async () => {
    const headers = ['최소소득', '최대소득', '부양가족', '세액'];
    for (const header of headers) {
      await expect(page.getByRole('columnheader', { name: header })).toBeVisible({ timeout: 10000 });
    }
  });

  test('4-3. 연도 필터가 보인다', async () => {
    await expect(page.locator('select').first()).toBeVisible();
  });

  test('4-4. "엑셀 업로드" 버튼이 보인다', async () => {
    await expect(page.getByRole('button', { name: /엑셀 업로드/ })).toBeVisible();
  });

  test('4-5. "간이세액표" 건수 텍스트가 보인다', async () => {
    await expect(page.locator('text=/간이세액표.*건/')).toBeVisible();
  });

  // ═══════════════════════════════════════════════════════════════
  // 탭 3: 비과세한도
  // ═══════════════════════════════════════════════════════════════

  test('5-1. 비과세한도 탭 클릭으로 전환된다', async () => {
    await page.getByRole('button', { name: '비과세한도', exact: true }).click();
    await page.waitForTimeout(1000);
  });

  test('5-2. 비과세한도 "추가" 버튼이 보인다', async () => {
    await expect(page.getByRole('button', { name: /추가/ })).toBeVisible();
  });

  test('5-3. 비과세한도 테이블 헤더가 보인다', async () => {
    const headers = ['코드', '항목명', '월한도액'];
    for (const header of headers) {
      await expect(page.getByRole('columnheader', { name: header })).toBeVisible({ timeout: 10000 });
    }
  });

  test('5-4. 비과세한도 테이블 또는 빈 상태가 보인다', async () => {
    // 데이터가 없을 수 있으므로 테이블 행 또는 빈 테이블 확인
    const hasRows = await page.locator('table tbody tr').first().isVisible({ timeout: 5000 }).catch(() => false);
    const hasTable = await page.locator('table').isVisible().catch(() => false);
    expect(hasRows || hasTable).toBeTruthy();
  });

  test('5-5. 연도 선택 필터가 보인다', async () => {
    await expect(page.locator('select').first()).toBeVisible();
  });

  // ═══════════════════════════════════════════════════════════════
  // 탭 4: 최저임금
  // ═══════════════════════════════════════════════════════════════

  test('6-1. 최저임금 탭 클릭으로 전환된다', async () => {
    await page.getByRole('button', { name: '최저임금', exact: true }).click();
    await page.waitForTimeout(1000);
  });

  test('6-2. 최저임금 "추가" 버튼이 보인다', async () => {
    await expect(page.getByRole('button', { name: /추가/ })).toBeVisible();
  });

  test('6-3. 최저임금 테이블 헤더가 보인다', async () => {
    const headers = ['연도', '시급', '월급(209h)', '설명'];
    for (const header of headers) {
      await expect(page.getByRole('columnheader', { name: header })).toBeVisible({ timeout: 10000 });
    }
  });

  test('6-4. 최저임금 데이터 행이 보인다', async () => {
    const rows = page.locator('table tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 10000 });
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('6-5. 2025 또는 2026 최저임금 데이터가 보인다', async () => {
    const yearData = page.locator('table tbody').locator('text=/2025|2026/');
    const count = await yearData.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  // ═══════════════════════════════════════════════════════════════
  // 탭 5: 법정상수
  // ═══════════════════════════════════════════════════════════════

  test('7-1. 법정상수 탭 클릭으로 전환된다', async () => {
    await page.getByRole('button', { name: '법정상수', exact: true }).click();
    await page.waitForTimeout(1000);
  });

  test('7-2. 법정상수 테이블 헤더가 보인다', async () => {
    const headers = ['카테고리', '키', '값', '설명', '단위'];
    for (const header of headers) {
      await expect(page.getByRole('columnheader', { name: header })).toBeVisible({ timeout: 10000 });
    }
  });

  test('7-3. 법정상수 데이터 행이 보인다', async () => {
    const rows = page.locator('table tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 10000 });
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('7-4. 카테고리 뱃지가 표시된다', async () => {
    // 법정상수 테이블에서 카테고리는 Badge 컴포넌트로 표시됨
    const badges = page.locator('table tbody span');
    const count = await badges.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('7-5. 편집(Pencil) 버튼이 보인다', async () => {
    const editButtons = page.locator('table tbody button');
    const count = await editButtons.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  // ═══════════════════════════════════════════════════════════════
  // 8. 콘솔 에러
  // ═══════════════════════════════════════════════════════════════

  test('8-1. 법정 파라미터 페이지에서 JS 에러가 없다', async ({ browser }) => {
    const authContext = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const authPage = await authContext.newPage();

    const errors: string[] = [];
    authPage.on('pageerror', (err) => {
      errors.push(err.message);
    });

    await authPage.goto('/super-admin/legal-params');
    await authPage.waitForSelector('text=법정 파라미터', { timeout: 15000 });
    await authPage.waitForTimeout(2000);

    expect(errors).toHaveLength(0);
    await authContext.close();
  });
});

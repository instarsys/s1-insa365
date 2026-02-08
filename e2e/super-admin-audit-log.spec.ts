import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import path from 'path';

const STORAGE_STATE_PATH = path.join(__dirname, '.super-admin-auth-state.json');

test.describe.serial('Super Admin 감사 로그 E2E 테스트', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await page.goto('/super-admin/audit-log');
    await page.waitForSelector('text=감사 로그', { timeout: 15000 });
    await page.waitForTimeout(1000);
  });

  test.afterAll(async () => {
    await context.close();
  });

  // ─── 1. 페이지 헤더 ────────────────────────────────────────

  test('1-1. "감사 로그" 제목이 보인다', async () => {
    await expect(page.getByRole('heading', { name: '감사 로그' })).toBeVisible();
  });

  test('1-2. 부제목 "시스템 변경 이력을 조회합니다."가 보인다', async () => {
    await expect(page.locator('text=시스템 변경 이력을 조회합니다.')).toBeVisible();
  });

  // ─── 2. 필터 영역 ─────────────────────────────────────────

  test('2-1. 엔티티 타입 필터(select)가 보인다', async () => {
    await expect(page.locator('text=엔티티 타입')).toBeVisible();
  });

  test('2-2. 액션 필터(select)가 보인다', async () => {
    await expect(page.getByLabel('액션')).toBeVisible();
  });

  test('2-3. 사용자 검색 input이 보인다', async () => {
    await expect(page.getByPlaceholder('사용자 ID 검색...')).toBeVisible();
  });

  test('2-4. 시작일 date input이 보인다', async () => {
    await expect(page.locator('text=시작일')).toBeVisible();
  });

  test('2-5. 종료일 date input이 보인다', async () => {
    await expect(page.locator('text=종료일')).toBeVisible();
  });

  // ─── 3. 로그 목록 헤더 ────────────────────────────────────

  test('3-1. 로그 헤더 행에 "일시" 컬럼이 보인다', async () => {
    await expect(page.locator('text=일시').first()).toBeVisible();
  });

  test('3-2. 로그 헤더 행에 "사용자" 컬럼이 보인다', async () => {
    await expect(page.locator('text=사용자').first()).toBeVisible();
  });

  // ─── 4. 로그 항목 ─────────────────────────────────────────

  test('4-1. 로그 항목이 최소 1건 존재하거나 "감사 로그가 없습니다" 메시지가 보인다', async () => {
    // API 데이터에 따라 로그 항목 또는 빈 상태 텍스트
    const hasLogs = await page.locator('.divide-y.divide-gray-100 > div').count();
    const hasEmptyMessage = await page.locator('text=감사 로그가 없습니다').isVisible().catch(() => false);
    expect(hasLogs > 0 || hasEmptyMessage).toBeTruthy();
  });

  test('4-2. 액션 뱃지가 표시된다 (로그가 있는 경우)', async () => {
    const logEntries = page.locator('.divide-y.divide-gray-100 > div');
    const count = await logEntries.count();
    if (count > 0) {
      // 로그 항목 내에 뱃지 텍스트 (생성/수정/삭제/조회/확정/취소/다운로드/로그인 중 하나)
      const badgeTexts = ['생성', '수정', '삭제', '조회', '확정', '취소', '다운로드', '로그인', '로그아웃'];
      let foundBadge = false;
      for (const text of badgeTexts) {
        const visible = await page.locator(`.divide-y.divide-gray-100 >> text=${text}`).first().isVisible().catch(() => false);
        if (visible) {
          foundBadge = true;
          break;
        }
      }
      expect(foundBadge).toBeTruthy();
    }
  });

  // ─── 5. 확장/접힘 ─────────────────────────────────────────

  test('5-1. 로그 항목 클릭 시 확장되어 "변경 전" 또는 "변경 후" 텍스트가 보인다', async () => {
    // cursor-pointer 클래스를 가진 로그 항목 (hasDiff=true인 경우만 클릭 가능)
    const clickableEntries = page.locator('button.cursor-pointer');
    const count = await clickableEntries.count();
    if (count > 0) {
      await clickableEntries.first().click();
      await page.waitForTimeout(500);
      // "변경 전 (Before)" 또는 "변경 후 (After)" 텍스트 확인
      const beforeVisible = await page.locator('text=변경 전').first().isVisible().catch(() => false);
      const afterVisible = await page.locator('text=변경 후').first().isVisible().catch(() => false);
      expect(beforeVisible || afterVisible).toBeTruthy();
    }
  });

  test('5-2. 확장된 항목을 다시 클릭하면 접힌다', async () => {
    const clickableEntries = page.locator('button.cursor-pointer');
    const count = await clickableEntries.count();
    if (count > 0) {
      // 이미 5-1에서 첫 번째 항목이 열려있으므로 다시 클릭하여 닫기
      await clickableEntries.first().click();
      await page.waitForTimeout(500);
      // "변경 전" 텍스트가 사라졌는지 확인
      const beforeVisible = await page.locator('text=변경 전 (Before)').isVisible().catch(() => false);
      expect(beforeVisible).toBeFalsy();
    }
  });

  // ─── 6. Pagination ────────────────────────────────────────

  test('6-1. Pagination 영역이 존재한다', async () => {
    // Pagination 컴포넌트 또는 페이지 번호 버튼 확인
    const pagination = page.locator('nav, [class*="pagination"]');
    const paginationCount = await pagination.count();
    // 또는 페이지 번호 버튼 "1"
    const pageOneButton = page.getByRole('button', { name: '1', exact: true });
    const hasPageButton = await pageOneButton.isVisible().catch(() => false);
    expect(paginationCount > 0 || hasPageButton).toBeTruthy();
  });

  // ─── 7. 콘솔 에러 ─────────────────────────────────────────

  test('7-1. 감사 로그 페이지에서 JS 에러가 없다', async ({ browser }) => {
    const authContext = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const authPage = await authContext.newPage();

    const errors: string[] = [];
    authPage.on('pageerror', (err) => {
      errors.push(err.message);
    });

    await authPage.goto('/super-admin/audit-log');
    await authPage.waitForSelector('text=감사 로그', { timeout: 15000 });
    await authPage.waitForTimeout(2000);

    expect(errors).toHaveLength(0);
    await authContext.close();
  });
});

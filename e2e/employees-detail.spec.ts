import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import path from 'path';

const STORAGE_STATE_PATH = path.join(__dirname, '.auth-state.json');

test.describe.serial('직원 상세 페이지 E2E 테스트', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await page.goto('/employees/list');
    await page.waitForSelector('table', { timeout: 15000 });
    // Click first data row to navigate to detail
    await page.locator('table tbody tr').first().click();
    await page.waitForURL(/\/employees\//, { timeout: 10000 });
    await page.waitForTimeout(1000);
  });

  test.afterAll(async () => {
    await context.close();
  });

  // ─── 1. 네비게이션 ────────────────────────────────────────

  test('1-1. /employees/list에서 행 클릭 시 /employees/[id]로 이동한다', async () => {
    expect(page.url()).toMatch(/\/employees\/[a-f0-9-]+$/);
  });

  // ─── 2. Breadcrumb ────────────────────────────────────────

  test('2-1. Breadcrumb에 "직원 관리" 링크가 보인다', async () => {
    await expect(page.getByRole('link', { name: '직원 관리' })).toBeVisible();
  });

  // ─── 3. 프로필 헤더 ───────────────────────────────────────

  test('3-1. 직원 이름 heading(h1)이 보인다', async () => {
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    const name = await heading.textContent();
    expect(name?.trim().length).toBeGreaterThan(0);
  });

  test('3-2. 상태 뱃지가 보인다 (재직/휴직/퇴직)', async () => {
    const badges = ['재직', '휴직', '퇴직'];
    let found = false;
    for (const badge of badges) {
      const visible = await page.locator(`text=${badge}`).first().isVisible().catch(() => false);
      if (visible) {
        found = true;
        break;
      }
    }
    expect(found).toBeTruthy();
  });

  test('3-3. 사번이 표시된다 (EA 형식)', async () => {
    await expect(page.locator('text=/EA\\d{4}/')).toBeVisible();
  });

  // ─── 4. Prev/Next 네비게이션 ──────────────────────────────

  test('4-1. N / Total 네비게이션 텍스트가 보인다', async () => {
    await expect(page.locator('text=/\\d+ \\/ \\d+/')).toBeVisible();
  });

  // ─── 5. 탭 버튼 ──────────────────────────────────────────

  test('5-1. 5개 탭 버튼이 보인다', async () => {
    const tabs = ['기본정보', '급여', '근태', '휴가', '문서'];
    for (const tab of tabs) {
      await expect(page.locator('main').getByRole('button', { name: tab, exact: true })).toBeVisible();
    }
  });

  // ─── 6. 기본정보 탭 (기본 활성) ───────────────────────────

  test('6-1. 기본정보 탭이 기본 활성이다', async () => {
    await expect(page.locator('text=기본 정보').first()).toBeVisible();
  });

  test('6-2. "기본 정보" 카드 제목이 보인다', async () => {
    await expect(page.locator('text=기본 정보').first()).toBeVisible();
  });

  test('6-3. 6개 InfoItem 라벨이 보인다', async () => {
    const labels = ['이메일', '연락처', '부서', '직급', '입사일', '근무지'];
    for (const label of labels) {
      await expect(page.locator(`text=${label}`).first()).toBeVisible();
    }
  });

  test('6-4. "수정" 버튼이 보인다', async () => {
    await expect(page.getByRole('button', { name: '수정' })).toBeVisible();
  });

  // ─── 7. 편집 모드 ─────────────────────────────────────────

  test('7-1. "수정" 클릭 시 "취소"와 "저장" 버튼이 표시된다', async () => {
    await page.getByRole('button', { name: '수정' }).click();
    await page.waitForTimeout(300);
    await expect(page.getByRole('button', { name: '취소' })).toBeVisible();
    await expect(page.getByRole('button', { name: '저장' })).toBeVisible();
  });

  test('7-2. "취소" 클릭 시 편집 모드가 해제되고 "수정" 버튼이 복귀한다', async () => {
    await page.getByRole('button', { name: '취소' }).click();
    await page.waitForTimeout(300);
    await expect(page.getByRole('button', { name: '수정' })).toBeVisible();
    // "취소"와 "저장" 버튼은 사라져야 함
    await expect(page.getByRole('button', { name: '취소' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: '저장' })).not.toBeVisible();
  });

  // ─── 8. 급여 탭 ──────────────────────────────────────────

  test('8-1. 급여 탭 클릭 시 급여 관련 콘텐츠가 보인다', async () => {
    await page.locator('main').getByRole('button', { name: '급여', exact: true }).click();
    await page.waitForTimeout(500);
    // "급여 항목" 제목 또는 EmptyState 중 하나
    const hasSalaryTitle = await page.locator('text=급여 항목').isVisible().catch(() => false);
    const hasSalaryEmpty = await page.locator('text=급여 항목이 없습니다').isVisible().catch(() => false);
    expect(hasSalaryTitle || hasSalaryEmpty).toBeTruthy();
  });

  test('8-2. 급여 테이블 또는 EmptyState가 보인다', async () => {
    // 급여 항목이 있으면 테이블, 없으면 EmptyState
    const hasTable = await page.locator('table').isVisible().catch(() => false);
    const hasEmpty = await page.locator('text=급여 항목이 없습니다').isVisible().catch(() => false);
    expect(hasTable || hasEmpty).toBeTruthy();
  });

  // ─── 9. 근태 탭 ──────────────────────────────────────────

  test('9-1. 근태 탭 클릭 시 "일별 근태 보기" 버튼이 보인다', async () => {
    await page.locator('main').getByRole('button', { name: '근태', exact: true }).click();
    await page.waitForTimeout(500);
    await expect(page.getByRole('button', { name: '일별 근태 보기' })).toBeVisible();
  });

  // ─── 10. 휴가 탭 ─────────────────────────────────────────

  test('10-1. 휴가 탭 클릭 시 "잔여 휴가" 카드가 보인다', async () => {
    await page.locator('main').getByRole('button', { name: '휴가', exact: true }).click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=잔여 휴가')).toBeVisible();
  });

  test('10-2. 총부여/사용/잔여 또는 fallback 텍스트가 보인다', async () => {
    const hasBalance = await page.locator('text=총 부여').isVisible().catch(() => false);
    const hasFallback = await page.locator('text=휴가 잔여 정보가 없습니다').isVisible().catch(() => false);
    expect(hasBalance || hasFallback).toBeTruthy();
  });

  // ─── 11. 문서 탭 ─────────────────────────────────────────

  test('11-1. 문서 탭 클릭 시 "문서 기능 준비 중" 메시지가 보인다', async () => {
    await page.locator('main').getByRole('button', { name: '문서', exact: true }).click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=문서 기능 준비 중')).toBeVisible();
  });

  test('11-2. "직원 문서 관리 기능은 다음 업데이트에서 제공됩니다." 설명이 보인다', async () => {
    await expect(page.locator('text=직원 문서 관리 기능은 다음 업데이트에서 제공됩니다.')).toBeVisible();
  });

  // ─── 12. 콘솔 에러 ────────────────────────────────────────

  test('12-1. 직원 상세 페이지에서 JS 에러가 없다', async ({ browser }) => {
    const authContext = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const authPage = await authContext.newPage();

    const errors: string[] = [];
    authPage.on('pageerror', (err) => {
      errors.push(err.message);
    });

    // 목록에서 첫 번째 행 클릭하여 상세 이동
    await authPage.goto('/employees/list');
    await authPage.waitForSelector('table', { timeout: 15000 });
    await authPage.locator('table tbody tr').first().click();
    await authPage.waitForURL(/\/employees\//, { timeout: 10000 });
    await authPage.waitForTimeout(2000);

    expect(errors).toHaveLength(0);
    await authContext.close();
  });
});

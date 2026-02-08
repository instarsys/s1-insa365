import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import path from 'path';

const BASE_URL = 'http://localhost:3001';
const STORAGE_STATE_PATH = path.join(__dirname, '.super-admin-auth-state.json');

test.describe.serial('Super Admin 테넌트 관리 E2E 테스트', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await page.goto('/super-admin/tenants');
    await page.waitForSelector('text=테넌트 관리', { timeout: 15000 });
  });

  test.afterAll(async () => {
    await context.close();
  });

  // ─── 1. 페이지 헤더 ────────────────────────────────────────

  test('1-1. "테넌트 관리" 제목이 보인다', async () => {
    await expect(page.getByRole('heading', { name: '테넌트 관리' })).toBeVisible();
  });

  test('1-2. 부제목 "등록된 회사(테넌트)를 관리합니다."가 보인다', async () => {
    await expect(page.locator('text=등록된 회사(테넌트)를 관리합니다.')).toBeVisible();
  });

  test('1-3. "테넌트 추가" 버튼이 보인다', async () => {
    await expect(page.locator('button:has-text("테넌트 추가")')).toBeVisible();
  });

  // ─── 2. 테이블 헤더 ────────────────────────────────────────

  test('2-1. "회사명" 컬럼 헤더가 보인다', async () => {
    await expect(page.getByRole('columnheader', { name: '회사명' })).toBeVisible();
  });

  test('2-2. "사업자번호" 컬럼 헤더가 보인다', async () => {
    await expect(page.getByRole('columnheader', { name: '사업자번호' })).toBeVisible();
  });

  test('2-3. "대표자" 컬럼 헤더가 보인다', async () => {
    await expect(page.getByRole('columnheader', { name: '대표자' })).toBeVisible();
  });

  test('2-4. "직원수" 컬럼 헤더가 보인다', async () => {
    await expect(page.getByRole('columnheader', { name: '직원수' })).toBeVisible();
  });

  test('2-5. "생성일" 컬럼 헤더가 보인다', async () => {
    await expect(page.getByRole('columnheader', { name: '생성일' })).toBeVisible();
  });

  test('2-6. "상태" 컬럼 헤더가 보인다', async () => {
    await expect(page.getByRole('columnheader', { name: '상태' })).toBeVisible();
  });

  // ─── 3. 테이블 데이터 ──────────────────────────────────────

  test('3-1. 테이블에 최소 1개 행이 있다', async () => {
    const rows = page.locator('tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('3-2. "활성" 상태 뱃지가 보인다', async () => {
    await expect(page.locator('tbody').locator('text=활성').first()).toBeVisible();
  });

  // ─── 4. 테넌트 추가 모달 ──────────────────────────────────

  test('4-1. "테넌트 추가" 클릭 시 모달이 열린다', async () => {
    await page.locator('button:has-text("테넌트 추가")').click();
    await expect(page.locator('text=새 테넌트 생성')).toBeVisible({ timeout: 5000 });
  });

  test('4-2. 모달 제목 "새 테넌트 생성"이 보인다', async () => {
    await expect(page.locator('text=새 테넌트 생성')).toBeVisible();
  });

  test('4-3. "회사명 *" 입력 필드가 보인다', async () => {
    await expect(page.locator('input[placeholder="회사명"]')).toBeVisible();
  });

  test('4-4. "사업자번호 *" 입력 필드가 보인다', async () => {
    await expect(page.locator('input[placeholder="000-00-00000"]')).toBeVisible();
  });

  test('4-5. "대표자" 입력 필드가 보인다', async () => {
    await expect(page.locator('input[placeholder="대표자명"]')).toBeVisible();
  });

  test('4-6. "이메일" 입력 필드가 보인다', async () => {
    await expect(page.locator('input[placeholder="admin@company.com"]')).toBeVisible();
  });

  test('4-7. "전화번호" 입력 필드가 보인다', async () => {
    await expect(page.locator('input[placeholder="02-0000-0000"]')).toBeVisible();
  });

  test('4-8. "취소" 버튼이 보인다', async () => {
    await expect(page.locator('button:has-text("취소")')).toBeVisible();
  });

  test('4-9. "생성" 버튼이 보인다', async () => {
    await expect(page.locator('button:has-text("생성")')).toBeVisible();
  });

  test('4-10. "취소" 클릭 시 모달이 닫힌다', async () => {
    await page.locator('button:has-text("취소")').click();
    await expect(page.locator('text=새 테넌트 생성')).not.toBeVisible({ timeout: 3000 });
  });

  // ─── 5. 콘솔 에러 ─────────────────────────────────────────

  test('5-1. 테넌트 관리 페이지에서 JS 에러가 없다', async ({ browser }) => {
    const authContext = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const authPage = await authContext.newPage();

    const errors: string[] = [];
    authPage.on('pageerror', (err) => {
      errors.push(err.message);
    });

    await authPage.goto('/super-admin/tenants');
    await authPage.waitForSelector('text=테넌트 관리', { timeout: 15000 });
    await authPage.waitForTimeout(2000);

    expect(errors).toHaveLength(0);
    await authContext.close();
  });
});

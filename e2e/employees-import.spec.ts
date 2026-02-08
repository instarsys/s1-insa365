import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import path from 'path';

const ADMIN_EMAIL = 'admin@test-company.com';
const ADMIN_PASSWORD = 'admin123!';
const STORAGE_STATE_PATH = path.join(__dirname, '.auth-state.json');

async function loginAndSaveState(page: Page) {
  await page.goto('/login');
  await page.getByRole('textbox', { name: '이메일' }).fill(ADMIN_EMAIL);
  await page.getByRole('textbox', { name: '비밀번호' }).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: '로그인' }).click();
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await page.context().storageState({ path: STORAGE_STATE_PATH });
}

test.describe.serial('일괄 업로드 E2E 테스트', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await page.goto('/employees/import');
    await page.waitForTimeout(2000);
  });

  test.afterAll(async () => {
    await context.close();
  });

  // ─── 1. 페이지 헤더 ──────────────────────────────────────────

  test('1-1. 제목 "일괄 업로드"가 보인다', async () => {
    await expect(page.getByRole('heading', { name: '일괄 업로드' })).toBeVisible();
  });

  test('1-2. 부제목이 보인다', async () => {
    await expect(page.locator('text=CSV 파일로 직원 정보를 일괄 등록합니다.')).toBeVisible();
  });

  // ─── 2. 파일 업로드 드롭존 ─────────────────────────────────────

  test('2-1. 업로드 아이콘이 보인다', async () => {
    await expect(page.locator('main svg.lucide-upload')).toBeVisible();
  });

  test('2-2. 드래그/클릭 안내 텍스트가 보인다', async () => {
    await expect(page.locator('text=파일을 드래그하거나 클릭하여 업로드')).toBeVisible();
  });

  test('2-3. 지원 형식 텍스트가 보인다', async () => {
    await expect(page.locator('text=CSV, XLS, XLSX 파일 (최대 10MB)')).toBeVisible();
  });

  test('2-4. 드롭존 영역이 클릭 가능하다', async () => {
    const dropzone = page.locator('main .cursor-pointer');
    await expect(dropzone).toBeVisible();
  });

  // ─── 3. 콘솔 에러 검증 ────────────────────────────────────────

  test('3-1. 일괄 업로드에서 JS 에러가 없다', async ({ browser }) => {
    const authContext = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const authPage = await authContext.newPage();

    const errors: string[] = [];
    authPage.on('pageerror', (err) => {
      errors.push(err.message);
    });

    await authPage.goto('/employees/import');
    await authPage.waitForTimeout(2000);

    expect(errors).toHaveLength(0);
    await authContext.close();
  });
});

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

test.describe.serial('회사 정보 E2E 테스트', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await page.goto('/settings/company');
    await page.waitForSelector('main h1', { timeout: 10000 });
    // API에서 회사 데이터 로드 대기 (폼 필드에 값이 채워질 때까지)
    await page.getByRole('textbox', { name: '상호' }).waitFor({ state: 'visible', timeout: 10000 });
    await expect(page.getByRole('textbox', { name: '상호' })).not.toHaveValue('', { timeout: 10000 });
  });

  test.afterAll(async () => {
    await context.close();
  });

  // ═══════════════════════════════════════════════════════════════
  // 1. 페이지 헤더
  // ═══════════════════════════════════════════════════════════════

  test('1-1. 제목 "회사 정보"가 보인다', async () => {
    await expect(page.getByRole('heading', { name: '회사 정보', level: 1 })).toBeVisible();
  });

  test('1-2. 부제목이 보인다', async () => {
    await expect(page.locator('text=회사 기본 정보를 설정합니다.')).toBeVisible();
  });

  // ═══════════════════════════════════════════════════════════════
  // 2. 기본 정보 섹션
  // ═══════════════════════════════════════════════════════════════

  test('2-1. 섹션 제목 "기본 정보"가 보인다', async () => {
    await expect(page.getByRole('heading', { name: '기본 정보', level: 3 })).toBeVisible();
  });

  test('2-2. 상호에 "테스트 주식회사"가 채워져 있다', async () => {
    await expect(page.getByRole('textbox', { name: '상호' })).toHaveValue('테스트 주식회사');
  });

  test('2-3. 사업자번호에 "123-45-67890"이 채워져 있다', async () => {
    await expect(page.getByRole('textbox', { name: '사업자번호' })).toHaveValue('123-45-67890');
  });

  test('2-4. 사업자번호 placeholder가 올바르다', async () => {
    await expect(page.getByRole('textbox', { name: '사업자번호' })).toHaveAttribute('placeholder', '000-00-00000');
  });

  test('2-5. 대표자명에 "홍길동"이 채워져 있다', async () => {
    await expect(page.getByRole('textbox', { name: '대표자명' })).toHaveValue('홍길동');
  });

  test('2-6. 전화번호에 "02-1234-5678"이 채워져 있다', async () => {
    await expect(page.getByRole('textbox', { name: '전화번호' })).toHaveValue('02-1234-5678');
  });

  test('2-7. 이메일에 "admin@test-company.com"이 채워져 있다', async () => {
    await expect(page.getByRole('textbox', { name: '이메일' })).toHaveValue('admin@test-company.com');
  });

  test('2-8. 주소에 "서울특별시 강남구 테헤란로 123"이 채워져 있다', async () => {
    await expect(page.getByRole('textbox', { name: '주소' })).toHaveValue('서울특별시 강남구 테헤란로 123');
  });

  // ═══════════════════════════════════════════════════════════════
  // 3. 급여 설정 섹션
  // ═══════════════════════════════════════════════════════════════

  test('3-1. 섹션 제목 "급여 설정"이 보인다', async () => {
    await expect(page.getByRole('heading', { name: '급여 설정', level: 3 })).toBeVisible();
  });

  test('3-2. 급여일 드롭다운에 25일이 선택되어 있다', async () => {
    await expect(page.getByRole('combobox', { name: '급여일' })).toHaveValue('25');
  });

  test('3-3. 급여일 드롭다운에 28개 옵션이 있다', async () => {
    const options = page.getByRole('combobox', { name: '급여일' }).locator('option');
    const count = await options.count();
    expect(count).toBe(28);
  });

  test('3-4. 월소정근로시간 숫자 입력 필드가 보인다', async () => {
    await expect(page.getByRole('spinbutton', { name: '월소정근로시간' })).toBeVisible();
  });

  test('3-5. 야간근로 시작 시간 입력 필드가 보인다', async () => {
    await expect(page.getByRole('textbox', { name: '야간근로 시작' })).toBeVisible();
  });

  test('3-6. 야간근로 종료 시간 입력 필드가 보인다', async () => {
    await expect(page.getByRole('textbox', { name: '야간근로 종료' })).toBeVisible();
  });

  test('3-7. 일할계산 방법에 "역일 기준"이 선택되어 있다', async () => {
    await expect(page.getByRole('combobox', { name: '일할계산 방법' })).toHaveValue('CALENDAR_DAY');
  });

  test('3-8. 일할계산 방법에 2개 옵션이 있다', async () => {
    const options = page.getByRole('combobox', { name: '일할계산 방법' }).locator('option');
    const count = await options.count();
    expect(count).toBe(2);
  });

  // ═══════════════════════════════════════════════════════════════
  // 4. 저장 버튼
  // ═══════════════════════════════════════════════════════════════

  test('4-1. 저장 버튼이 보인다', async () => {
    await expect(page.getByRole('button', { name: '저장' })).toBeVisible();
  });

  // ═══════════════════════════════════════════════════════════════
  // 5. 콘솔 에러 검증
  // ═══════════════════════════════════════════════════════════════

  test('5-1. 회사 정보에서 JS 에러가 없다', async ({ browser }) => {
    const authContext = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const authPage = await authContext.newPage();

    const errors: string[] = [];
    authPage.on('pageerror', (err) => {
      errors.push(err.message);
    });

    await authPage.goto('/settings/company');
    await authPage.waitForSelector('main h1', { timeout: 10000 });
    await authPage.waitForTimeout(2000);

    expect(errors).toHaveLength(0);
    await authContext.close();
  });
});

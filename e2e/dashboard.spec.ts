import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import path from 'path';

const BASE_URL = 'http://localhost:3001';
const STORAGE_STATE_PATH = path.join(__dirname, '.auth-state.json');

test.describe.serial('대시보드 E2E 테스트', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await page.goto('/dashboard');
    await page.waitForSelector('text=관리자님', { timeout: 15000 });
  });

  test.afterAll(async () => {
    await context.close();
  });

  // ─── 1. 인증 및 접근 제어 ───────────────────────────────────

  test('1-1. 미인증 사용자는 /login으로 리다이렉트된다', async ({ browser }) => {
    const freshContext = await browser.newContext({ storageState: undefined });
    const freshPage = await freshContext.newPage();
    await freshPage.goto('/dashboard');
    await freshPage.waitForURL(/\/login/, { timeout: 10000 });
    expect(freshPage.url()).toContain('/login');
    await freshContext.close();
  });

  test('1-2. 로그인 후 /dashboard에 있다', async () => {
    expect(page.url()).toBe(`${BASE_URL}/dashboard`);
  });

  // ─── 2. Top Bar ─────────────────────────────────────────────

  test('2-1. 로고 "s1-insa365" 텍스트가 보인다', async () => {
    await expect(page.locator('header').locator('text=s1-insa365')).toBeVisible();
  });

  test('2-2. 검색 버튼이 보인다', async () => {
    await expect(page.getByRole('button', { name: /검색/ })).toBeVisible();
  });

  test('2-3. 검색 버튼 클릭 시 검색 모달이 열린다', async () => {
    await page.getByRole('button', { name: /검색/ }).click();
    await expect(page.getByRole('textbox', { name: /검색/ })).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('2-4. Ctrl+K 단축키로 검색 모달이 열린다', async () => {
    await page.keyboard.press('Control+k');
    await expect(page.getByRole('textbox', { name: /검색/ })).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('2-5. 검색에서 "김" 입력 시 "김영수" 결과가 표시된다', async () => {
    await page.getByRole('button', { name: /검색/ }).click();
    await page.getByRole('textbox', { name: /검색/ }).fill('김');
    await expect(page.getByRole('button', { name: /김영수/ })).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('2-6. 알림 벨에 뱃지가 표시된다', async () => {
    const bellButton = page.locator('header').getByRole('button').filter({ hasText: /^\d+$/ });
    await expect(bellButton).toBeVisible();
  });

  test('2-7. 회사명 "테스트 주식회사"가 보인다', async () => {
    await expect(page.getByRole('button', { name: '테스트 주식회사' })).toBeVisible();
  });

  test('2-8. 프로필 아바타 클릭 시 드롭다운이 열린다', async () => {
    await page.getByRole('button', { name: '관', exact: true }).click();
    await expect(page.getByText('관리자', { exact: true })).toBeVisible();
    await expect(page.getByText('admin@test-company.com')).toBeVisible();
    await expect(page.getByRole('button', { name: '내 프로필' })).toBeVisible();
    await expect(page.getByRole('button', { name: '로그아웃' })).toBeVisible();
    await page.keyboard.press('Escape');
  });

  // ─── 3. 사이드바 ────────────────────────────────────────────

  test('3-1. 대시보드 링크가 보인다', async () => {
    await expect(page.getByRole('link', { name: '대시보드' })).toBeVisible();
  });

  test('3-2. 버전 v0.1.0 텍스트가 보인다', async () => {
    await expect(page.locator('text=v0.1.0')).toBeVisible();
  });

  test('3-3. 메뉴 그룹이 모두 보인다', async () => {
    const menus = ['직원 관리', '근태 관리', '급여 관리', '세무/신고', '리포트', '설정'];
    for (const name of menus) {
      await expect(page.getByRole('button', { name })).toBeVisible();
    }
  });

  test('3-4. 직원 관리 하위 메뉴가 펼쳐진다', async () => {
    await page.getByRole('button', { name: '직원 관리' }).click();
    await expect(page.getByRole('link', { name: '직원 목록' })).toBeVisible();
    await expect(page.getByRole('link', { name: '부서/직급 관리' })).toBeVisible();
    await expect(page.getByRole('link', { name: '일괄 업로드' })).toBeVisible();
  });

  test('3-5. 근태 관리 하위 메뉴가 펼쳐진다', async () => {
    await page.getByRole('button', { name: '근태 관리' }).click();
    await expect(page.getByRole('link', { name: '일별 근태' })).toBeVisible();
    await expect(page.getByRole('link', { name: '월별 현황' })).toBeVisible();
    await expect(page.getByRole('link', { name: '휴가 관리' })).toBeVisible();
    await expect(page.getByRole('link', { name: '52시간 모니터링' })).toBeVisible();
  });

  test('3-6. 급여 관리 하위 메뉴가 펼쳐진다', async () => {
    await page.getByRole('button', { name: '급여 관리' }).click();
    await expect(page.getByRole('link', { name: '급여 실행' })).toBeVisible();
    await expect(page.getByRole('link', { name: '급여 이력' })).toBeVisible();
    await expect(page.getByRole('link', { name: '급여대장' })).toBeVisible();
    await expect(page.getByRole('link', { name: '급여명세서' })).toBeVisible();
  });

  test('3-7. 리포트 하위 메뉴가 펼쳐진다', async () => {
    await page.getByRole('button', { name: '리포트' }).click();
    await expect(page.getByRole('link', { name: '급여 리포트' })).toBeVisible();
    await expect(page.getByRole('link', { name: '근태 리포트' })).toBeVisible();
    await expect(page.getByRole('link', { name: '부서별 인건비' })).toBeVisible();
    await expect(page.getByRole('link', { name: '4대보험 현황' })).toBeVisible();
  });

  test('3-8. 설정 하위 메뉴가 펼쳐진다', async () => {
    await page.getByRole('button', { name: '설정' }).click();
    await expect(page.getByRole('link', { name: '회사 정보' })).toBeVisible();
    await expect(page.getByRole('link', { name: '근무 정책' })).toBeVisible();
    await expect(page.getByRole('link', { name: '급여 규칙' })).toBeVisible();
    await expect(page.getByRole('link', { name: '플랜/결제' })).toBeVisible();
  });

  // ─── 4. 메인 콘텐츠 ────────────────────────────────────────

  test('4-1. 인사말에 "관리자님"이 포함된다', async () => {
    await expect(page.getByRole('heading', { name: /관리자님/ })).toBeVisible();
  });

  test('4-2. 부제목에 "테스트 주식회사"가 포함된다', async () => {
    await expect(page.locator('text=테스트 주식회사의 오늘 현황입니다.')).toBeVisible();
  });

  test('4-3. 오늘의 할 일 카드가 보인다', async () => {
    await expect(page.getByRole('heading', { name: '오늘의 할 일' })).toBeVisible();
  });

  test('4-4. 할 일 건수 뱃지가 보인다', async () => {
    await expect(page.locator('text=/\\d+건/')).toBeVisible();
  });

  test('4-5. To-Do 아이템이 보인다', async () => {
    await expect(page.locator('p:text-is("읽지 않은 알림")')).toBeVisible();
    await expect(page.locator('text=읽지 않은 알림이 있습니다.')).toBeVisible();
  });

  test('4-6. 우선순위 뱃지가 보인다', async () => {
    await expect(page.locator('text=낮음')).toBeVisible();
  });

  test('4-7. 처리하기 CTA가 보인다', async () => {
    await expect(page.locator('text=처리하기')).toBeVisible();
  });

  test('4-8. 오늘 출근 현황 카드가 보인다', async () => {
    await expect(page.getByRole('heading', { name: '오늘 출근 현황' })).toBeVisible();
  });

  test('4-9. 출근 현황 라벨이 보인다', async () => {
    for (const label of ['전체', '출근', '결근', '지각']) {
      await expect(page.locator(`p:text-is("${label}")`)).toBeVisible();
    }
    await expect(page.locator('main').locator('p:text-is("휴가")')).toBeVisible();
  });

  test('4-10. StatCard — 총 직원수가 보인다', async () => {
    await expect(page.locator('text=총 직원수')).toBeVisible();
  });

  test('4-11. StatCard — 금월 인건비가 보인다', async () => {
    await expect(page.locator('text=금월 인건비')).toBeVisible();
  });

  test('4-12. StatCard — 오늘 출근율이 보인다', async () => {
    await expect(page.locator('text=오늘 출근율')).toBeVisible();
  });

  test('4-13. StatCard — 52시간 경고가 보인다', async () => {
    await expect(page.locator('text=52시간 경고')).toBeVisible();
  });

  // ─── 5. 콘솔 에러 ───────────────────────────────────────────

  test('5-1. 대시보드에서 JS 에러가 없다', async ({ browser }) => {
    // 저장된 인증 상태로 새 context 생성 (로그인 불필요)
    const authContext = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const authPage = await authContext.newPage();

    const errors: string[] = [];
    authPage.on('pageerror', (err) => {
      errors.push(err.message);
    });

    await authPage.goto('/dashboard');
    await authPage.waitForSelector('text=관리자님', { timeout: 15000 });
    await authPage.waitForTimeout(2000);

    expect(errors).toHaveLength(0);
    await authContext.close();
  });

  // ─── 6. 로그아웃 (마지막에 실행) ────────────────────────────

  test('6-1. 로그아웃 시 /login으로 이동한다', async ({ browser }) => {
    // 저장된 인증 상태로 새 context 생성
    const authContext = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const authPage = await authContext.newPage();
    await authPage.goto('/dashboard');
    await authPage.waitForSelector('text=관리자님', { timeout: 15000 });

    await authPage.getByRole('button', { name: '관', exact: true }).click();
    await authPage.getByRole('button', { name: '로그아웃' }).click();
    await authPage.waitForURL(/\/login/, { timeout: 10000 });
    expect(authPage.url()).toContain('/login');
    await authContext.close();
  });
});

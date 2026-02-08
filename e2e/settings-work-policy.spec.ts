import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import path from 'path';

const STORAGE_STATE_PATH = path.join(__dirname, '.auth-state.json');

test.describe.serial('근무 정책 E2E 테스트', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await page.goto('/settings/work-policy');
    await page.waitForTimeout(2000);
  });

  test.afterAll(async () => {
    await context.close();
  });

  // ═══════════════════════════════════════════════════════════════
  // 1. 페이지 헤더
  // ═══════════════════════════════════════════════════════════════

  test('1-1. 제목 "근무 정책"이 보인다', async () => {
    await expect(page.getByRole('heading', { name: '근무 정책', level: 1 })).toBeVisible();
  });

  test('1-2. 부제목이 보인다', async () => {
    await expect(page.locator('text=근무 시간 및 정책을 설정합니다.')).toBeVisible();
  });

  test('1-3. 정책 추가 버튼이 보인다', async () => {
    await expect(page.getByRole('button', { name: '정책 추가' }).first()).toBeVisible();
  });

  // ═══════════════════════════════════════════════════════════════
  // 2. 빈 상태
  // ═══════════════════════════════════════════════════════════════

  test('2-1. 빈 상태 제목 "등록된 근무 정책이 없습니다"가 보인다', async () => {
    await expect(page.getByRole('heading', { name: '등록된 근무 정책이 없습니다' })).toBeVisible();
  });

  test('2-2. 빈 상태 영역에도 정책 추가 버튼이 있다', async () => {
    const buttons = page.getByRole('button', { name: '정책 추가' });
    const count = await buttons.count();
    expect(count).toBe(2);
  });

  // ═══════════════════════════════════════════════════════════════
  // 3. 정책 추가 모달
  // ═══════════════════════════════════════════════════════════════

  test('3-1. 정책 추가 버튼 클릭 시 모달이 열린다', async () => {
    await page.getByRole('button', { name: '정책 추가' }).first().click();
    await expect(page.getByRole('heading', { name: '근무 정책 추가', level: 2 })).toBeVisible();
  });

  test('3-2. 정책명 입력 필드가 보인다', async () => {
    const input = page.getByRole('textbox', { name: '정책명' });
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('placeholder', '예: 일반 근무');
  });

  test('3-3. 출근 시간 기본값이 09:00이다', async () => {
    await expect(page.getByRole('textbox', { name: '출근 시간' })).toHaveValue('09:00');
  });

  test('3-4. 퇴근 시간 기본값이 18:00이다', async () => {
    await expect(page.getByRole('textbox', { name: '퇴근 시간' })).toHaveValue('18:00');
  });

  test('3-5. 휴게 시간 기본값이 60분이다', async () => {
    await expect(page.getByRole('spinbutton', { name: '휴게 시간 (분)' })).toHaveValue('60');
  });

  test('3-6. 근무일 라벨이 보인다', async () => {
    await expect(page.locator('text=근무일')).toBeVisible();
  });

  test('3-7. 요일 버튼 7개가 보인다', async () => {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    for (const day of days) {
      await expect(page.locator('.flex.gap-2 button').filter({ hasText: day })).toBeVisible();
    }
  });

  test('3-8. 기본 정책 체크박스가 보인다 (체크 해제 상태)', async () => {
    const checkbox = page.getByRole('checkbox', { name: '기본 정책으로 설정' });
    await expect(checkbox).toBeVisible();
    await expect(checkbox).not.toBeChecked();
  });

  test('3-9. 정책명 비어있으면 저장 버튼이 disabled이다', async () => {
    await expect(page.getByRole('button', { name: '저장' })).toBeDisabled();
  });

  test('3-10. 취소 버튼이 보인다', async () => {
    await expect(page.getByRole('button', { name: '취소' })).toBeVisible();
  });

  test('3-11. 취소 클릭 시 모달이 닫힌다', async () => {
    await page.getByRole('button', { name: '취소' }).click();
    await expect(page.getByRole('heading', { name: '근무 정책 추가', level: 2 })).not.toBeVisible();
  });

  // ═══════════════════════════════════════════════════════════════
  // 4. 콘솔 에러 검증
  // ═══════════════════════════════════════════════════════════════

  test('4-1. 근무 정책에서 JS 에러가 없다', async ({ browser }) => {
    const authContext = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const authPage = await authContext.newPage();

    const errors: string[] = [];
    authPage.on('pageerror', (err) => {
      errors.push(err.message);
    });

    await authPage.goto('/settings/work-policy');
    await authPage.waitForTimeout(2000);

    expect(errors).toHaveLength(0);
    await authContext.close();
  });
});

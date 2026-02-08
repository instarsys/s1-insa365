import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import path from 'path';

const BASE_URL = 'http://localhost:3001';
const STORAGE_STATE_PATH = path.join(__dirname, '.employee-auth-state.json');

test.describe.serial('직원 MY 페이지 E2E 테스트', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await page.goto('/my');
    await page.waitForSelector('text=직원', { timeout: 15000 });
  });

  test.afterAll(async () => {
    await context.close();
  });

  // --- 1. 프로필 헤더 ---

  test('1-1. 프로필 이름이 표시된다', async () => {
    const nameEl = page.locator('p.text-lg.font-semibold');
    await expect(nameEl).toBeVisible();
    const name = await nameEl.textContent();
    expect(name).toBeTruthy();
    expect(name).not.toBe('-');
  });

  test('1-2. 사번이 표시된다', async () => {
    // Employee number like EA1234
    const empNum = page.locator('p.text-xs.text-gray-500');
    await expect(empNum.first()).toBeVisible();
  });

  test('1-3. "직원" 역할 뱃지가 보인다', async () => {
    await expect(page.locator('span:text-is("직원")')).toBeVisible();
  });

  // --- 2. 정보 카드 ---

  test('2-1. "입사일" 필드가 보인다', async () => {
    await expect(page.locator('text=입사일')).toBeVisible();
  });

  test('2-2. "이메일" 필드가 보인다', async () => {
    await expect(page.locator('text=이메일')).toBeVisible();
  });

  test('2-3. "연락처" 필드가 보인다', async () => {
    await expect(page.locator('text=연락처')).toBeVisible();
  });

  // --- 3. 연락처 수정 ---

  test('3-1. "수정" 버튼이 보인다', async () => {
    await expect(page.getByRole('button', { name: '수정', exact: true })).toBeVisible();
  });

  test('3-2. "수정" 클릭 시 입력 필드와 저장/취소 버튼이 보인다', async () => {
    await page.getByRole('button', { name: '수정', exact: true }).click();
    await page.waitForTimeout(300);
    await expect(page.locator('button:has-text("저장")')).toBeVisible();
    await expect(page.locator('button:has-text("취소")')).toBeVisible();
  });

  test('3-3. "취소" 클릭 시 편집이 해제된다', async () => {
    await page.locator('button:has-text("취소")').click();
    await page.waitForTimeout(300);
    await expect(page.getByRole('button', { name: '수정', exact: true })).toBeVisible();
  });

  // --- 4. 비밀번호 변경 ---

  test('4-1. "비밀번호 변경" 버튼이 보인다', async () => {
    await expect(page.locator('button:has-text("비밀번호 변경")')).toBeVisible();
  });

  test('4-2. 클릭 시 비밀번호 변경 모달이 열린다', async () => {
    await page.locator('button:has-text("비밀번호 변경")').click();
    await page.waitForTimeout(300);
    await expect(page.locator('text=현재 비밀번호')).toBeVisible();
    await expect(page.locator('text=새 비밀번호').first()).toBeVisible();
    await expect(page.locator('text=새 비밀번호 확인')).toBeVisible();
    await expect(page.locator('button:has-text("취소")')).toBeVisible();
    await expect(page.getByRole('button', { name: '변경', exact: true })).toBeVisible();
  });

  test('4-3. 모달 닫기 (취소) 버튼으로 닫힌다', async () => {
    await page.locator('button:has-text("취소")').click();
    await page.waitForTimeout(300);
    await expect(page.locator('text=현재 비밀번호')).not.toBeVisible();
  });

  // --- 5. 알림 설정 ---

  test('5-1. "알림 설정" 버튼이 보인다', async () => {
    await expect(page.locator('button:has-text("알림 설정")')).toBeVisible();
  });

  test('5-2. 클릭 시 알림 설정 모달이 열린다', async () => {
    await page.locator('button:has-text("알림 설정")').click();
    await page.waitForTimeout(300);
    await expect(page.locator('text=급여 알림')).toBeVisible();
    await expect(page.locator('text=근태 알림')).toBeVisible();
    await expect(page.locator('text=휴가 알림')).toBeVisible();
  });

  test('5-3. 알림 설정 모달에 체크박스 3개가 있다', async () => {
    const checkboxes = page.locator('input[type="checkbox"]');
    expect(await checkboxes.count()).toBe(3);
  });

  test('5-4. 모달 닫기 버튼으로 닫힌다', async () => {
    await page.locator('button:has-text("닫기")').click();
    await page.waitForTimeout(300);
    await expect(page.locator('text=급여 알림')).not.toBeVisible();
  });

  // --- 6. 로그아웃 ---

  test('6-1. "로그아웃" 버튼이 빨간색으로 보인다', async () => {
    const logoutBtn = page.locator('button:has-text("로그아웃")');
    await expect(logoutBtn).toBeVisible();
    // Check red text
    const textEl = logoutBtn.locator('span.text-red-600');
    await expect(textEl).toBeVisible();
  });

  // --- 7. JS 에러 ---

  test('7-1. MY 페이지에서 JS 에러가 없다', async ({ browser }) => {
    const authContext = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const authPage = await authContext.newPage();

    const errors: string[] = [];
    authPage.on('pageerror', (err) => {
      errors.push(err.message);
    });

    await authPage.goto('/my');
    await authPage.waitForSelector('text=직원', { timeout: 15000 });
    await authPage.waitForTimeout(2000);

    expect(errors).toHaveLength(0);
    await authContext.close();
  });
});

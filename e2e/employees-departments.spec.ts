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

test.describe.serial('부서/직급 관리 E2E 테스트', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await page.goto('/employees/departments');
    await page.waitForSelector('table', { timeout: 10000 });
  });

  test.afterAll(async () => {
    await context.close();
  });

  // ═══════════════════════════════════════════════════════════════
  // 1. 페이지 헤더
  // ═══════════════════════════════════════════════════════════════

  test('1-1. 제목 "부서/직급 관리"가 보인다', async () => {
    await expect(page.getByRole('heading', { name: '부서/직급 관리' })).toBeVisible();
  });

  test('1-2. 부제목이 보인다', async () => {
    await expect(page.locator('text=부서와 직급을 설정합니다.')).toBeVisible();
  });

  test('1-3. 부서 추가 버튼이 보인다', async () => {
    await expect(page.getByRole('button', { name: '부서 추가' })).toBeVisible();
  });

  // ═══════════════════════════════════════════════════════════════
  // 2. 탭 전환
  // ═══════════════════════════════════════════════════════════════

  test('2-1. 부서 탭이 보인다', async () => {
    await expect(page.getByRole('button', { name: '부서', exact: true })).toBeVisible();
  });

  test('2-2. 직급 탭이 보인다', async () => {
    await expect(page.getByRole('button', { name: '직급', exact: true })).toBeVisible();
  });

  test('2-3. 직급 탭 클릭 시 버튼이 "직급 추가"로 바뀐다', async () => {
    await page.getByRole('button', { name: '직급', exact: true }).click();
    await expect(page.getByRole('button', { name: '직급 추가' })).toBeVisible();
    // 부서 탭으로 복원
    await page.getByRole('button', { name: '부서', exact: true }).click();
    await expect(page.getByRole('button', { name: '부서 추가' })).toBeVisible();
  });

  // ═══════════════════════════════════════════════════════════════
  // 3. 부서 테이블
  // ═══════════════════════════════════════════════════════════════

  test('3-1. 3개 컬럼 헤더가 보인다', async () => {
    const headers = ['부서명', '부서 코드', '정렬 순서'];
    for (const header of headers) {
      await expect(page.getByRole('columnheader', { name: header })).toBeVisible();
    }
  });

  test('3-2. 5개 부서 행이 있다', async () => {
    const rows = page.locator('tbody tr');
    const count = await rows.count();
    expect(count).toBe(5);
  });

  test('3-3. 5개 부서명이 모두 표시된다', async () => {
    const departments = ['경영지원팀', '개발팀', '영업팀', '마케팅팀', '인사팀'];
    for (const dept of departments) {
      await expect(page.getByRole('cell', { name: dept, exact: true })).toBeVisible();
    }
  });

  test('3-4. 첫 번째 행 데이터가 올바르다', async () => {
    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow.getByRole('cell', { name: '경영지원팀' })).toBeVisible();
    await expect(firstRow.getByRole('cell', { name: 'DEPT-001' })).toBeVisible();
    await expect(firstRow.getByRole('cell', { name: '1', exact: true })).toBeVisible();
  });

  test('3-5. 각 행에 액션 버튼 2개가 있다', async () => {
    const firstRow = page.locator('tbody tr').first();
    const buttons = firstRow.getByRole('button');
    const count = await buttons.count();
    expect(count).toBe(2);
  });

  // ═══════════════════════════════════════════════════════════════
  // 4. 직급 테이블
  // ═══════════════════════════════════════════════════════════════

  test.describe('직급 탭', () => {
    test.beforeAll(async () => {
      await page.getByRole('button', { name: '직급', exact: true }).click();
      await page.waitForTimeout(500);
    });

    test('4-1. 2개 컬럼 헤더가 보인다', async () => {
      const headers = ['직급명', '레벨'];
      for (const header of headers) {
        await expect(page.getByRole('columnheader', { name: header })).toBeVisible();
      }
    });

    test('4-2. 5개 직급 행이 있다', async () => {
      const rows = page.locator('tbody tr');
      const count = await rows.count();
      expect(count).toBe(5);
    });

    test('4-3. 5개 직급명이 모두 표시된다', async () => {
      const positions = ['사원', '과장', '부장', '이사', '대표이사'];
      for (const pos of positions) {
        await expect(page.getByRole('cell', { name: pos, exact: true })).toBeVisible();
      }
    });

    test('4-4. 첫 번째 행 데이터가 올바르다', async () => {
      const firstRow = page.locator('tbody tr').first();
      await expect(firstRow.getByRole('cell', { name: '사원' })).toBeVisible();
      await expect(firstRow.getByRole('cell', { name: '5', exact: true })).toBeVisible();
    });

    test('4-5. 각 행에 액션 버튼 2개가 있다', async () => {
      const firstRow = page.locator('tbody tr').first();
      const buttons = firstRow.getByRole('button');
      const count = await buttons.count();
      expect(count).toBe(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 5. 부서 추가 모달
  // ═══════════════════════════════════════════════════════════════

  test.describe('부서 추가 모달', () => {
    test.beforeAll(async () => {
      // 부서 탭으로 복원
      await page.getByRole('button', { name: '부서', exact: true }).click();
      await page.waitForTimeout(500);
    });

    test('5-1. 부서 추가 버튼 클릭 시 모달이 열린다', async () => {
      await page.getByRole('button', { name: '부서 추가' }).click();
      await expect(page.getByRole('heading', { name: '부서 추가', level: 2 })).toBeVisible();
    });

    test('5-2. 3개 입력 필드가 보인다', async () => {
      await expect(page.getByRole('textbox', { name: '부서명' })).toBeVisible();
      await expect(page.getByRole('textbox', { name: '부서 코드' })).toBeVisible();
      await expect(page.getByRole('spinbutton', { name: '정렬 순서' })).toBeVisible();
    });

    test('5-3. placeholder가 올바르다', async () => {
      await expect(page.getByRole('textbox', { name: '부서명' })).toHaveAttribute('placeholder', '예: 개발부');
      await expect(page.getByRole('textbox', { name: '부서 코드' })).toHaveAttribute('placeholder', '예: DEV');
    });

    test('5-4. 정렬 순서 기본값이 0이다', async () => {
      await expect(page.getByRole('spinbutton', { name: '정렬 순서' })).toHaveValue('0');
    });

    test('5-5. 취소/저장 버튼이 보인다', async () => {
      await expect(page.getByRole('button', { name: '취소' })).toBeVisible();
      await expect(page.getByRole('button', { name: '저장' })).toBeVisible();
    });

    test('5-6. 취소 클릭 시 모달이 닫힌다', async () => {
      await page.getByRole('button', { name: '취소' }).click();
      await expect(page.getByRole('heading', { name: '부서 추가', level: 2 })).not.toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 6. 부서 수정 모달
  // ═══════════════════════════════════════════════════════════════

  test.describe('부서 수정 모달', () => {
    test('6-1. 수정 버튼 클릭 시 모달이 열린다', async () => {
      const firstRow = page.locator('tbody tr').first();
      await firstRow.getByRole('button').first().click();
      await expect(page.getByRole('heading', { name: '부서 수정', level: 2 })).toBeVisible();
    });

    test('6-2. 기존 값이 채워져 있다', async () => {
      await expect(page.getByRole('textbox', { name: '부서명' })).toHaveValue('경영지원팀');
      await expect(page.getByRole('textbox', { name: '부서 코드' })).toHaveValue('DEPT-001');
      await expect(page.getByRole('spinbutton', { name: '정렬 순서' })).toHaveValue('1');
    });

    test('6-3. 취소/저장 버튼이 보인다', async () => {
      await expect(page.getByRole('button', { name: '취소' })).toBeVisible();
      await expect(page.getByRole('button', { name: '저장' })).toBeVisible();
    });

    test('6-4. 취소 클릭 시 모달이 닫힌다', async () => {
      await page.getByRole('button', { name: '취소' }).click();
      await expect(page.getByRole('heading', { name: '부서 수정', level: 2 })).not.toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 7. 콘솔 에러 검증
  // ═══════════════════════════════════════════════════════════════

  test('7-1. 부서/직급 관리에서 JS 에러가 없다', async ({ browser }) => {
    const authContext = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const authPage = await authContext.newPage();

    const errors: string[] = [];
    authPage.on('pageerror', (err) => {
      errors.push(err.message);
    });

    await authPage.goto('/employees/departments');
    await authPage.waitForSelector('table', { timeout: 10000 });
    await authPage.waitForTimeout(2000);

    expect(errors).toHaveLength(0);
    await authContext.close();
  });
});

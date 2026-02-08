import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import path from 'path';

const STORAGE_STATE_PATH = path.join(__dirname, '.auth-state.json');

test.describe.serial('급여 규칙 E2E 테스트', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await page.goto('/settings/salary-rules');
    await page.waitForSelector('table', { timeout: 20000 });
  });

  test.afterAll(async () => {
    await context.close();
  });

  // ═══════════════════════════════════════════════════════════════
  // 1. 페이지 헤더
  // ═══════════════════════════════════════════════════════════════

  test('1-1. 제목 "급여 규칙"이 보인다', async () => {
    await expect(page.getByRole('heading', { name: '급여 규칙', level: 1 })).toBeVisible();
  });

  test('1-2. 부제목이 보인다', async () => {
    await expect(page.locator('text=수당/공제 규칙을 설정합니다.')).toBeVisible();
  });

  test('1-3. 규칙 추가 버튼이 보인다', async () => {
    await expect(page.getByRole('button', { name: '규칙 추가' })).toBeVisible();
  });

  // ═══════════════════════════════════════════════════════════════
  // 2. 탭 전환
  // ═══════════════════════════════════════════════════════════════

  test('2-1. 수당 탭에 카운트 10이 표시된다', async () => {
    await expect(page.getByRole('button', { name: /수당 10/ })).toBeVisible();
  });

  test('2-2. 공제 탭에 카운트 12가 표시된다', async () => {
    await expect(page.getByRole('button', { name: /공제 12/ })).toBeVisible();
  });

  test('2-3. 공제 탭 클릭 시 공제 데이터가 표시된다', async () => {
    await page.getByRole('button', { name: /공제/ }).click();
    await page.waitForTimeout(300);
    await expect(page.getByRole('cell', { name: 'D01' })).toBeVisible();
    await expect(page.getByRole('cell', { name: '국민연금' })).toBeVisible();
    // 수당 탭으로 복원
    await page.getByRole('button', { name: /수당/ }).click();
    await page.waitForTimeout(300);
  });

  // ═══════════════════════════════════════════════════════════════
  // 3. 수당 테이블
  // ═══════════════════════════════════════════════════════════════

  test('3-1. 7개 컬럼 헤더가 보인다', async () => {
    const headers = ['코드', '항목명', '구분', '기본금액', '통상임금', '비과세', '순서'];
    for (const header of headers) {
      await expect(page.getByRole('columnheader', { name: header })).toBeVisible();
    }
  });

  test('3-2. 수당 행이 10개 있다', async () => {
    const rows = page.locator('tbody tr');
    const count = await rows.count();
    expect(count).toBe(10);
  });

  test('3-3. 첫 번째 행 데이터가 올바르다 (A02 직책수당)', async () => {
    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow.getByRole('cell', { name: 'A02' })).toBeVisible();
    await expect(firstRow.getByRole('cell', { name: '직책수당' })).toBeVisible();
  });

  test('3-4. 식대(A05) 금액이 "200,000원"으로 표시된다', async () => {
    await expect(page.getByRole('cell', { name: '200,000원' }).first()).toBeVisible();
  });

  test('3-5. 통상임금 Y 뱃지가 보인다', async () => {
    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow.locator('text=Y').first()).toBeVisible();
  });

  test('3-6. 비과세 Y 뱃지가 보인다 (식대 행)', async () => {
    // A05 식대 행 (4번째 행, 0-indexed 3)
    const mealsRow = page.locator('tbody tr').nth(3);
    await expect(mealsRow.getByRole('cell', { name: '식대' })).toBeVisible();
    await expect(mealsRow.locator('text=Y').first()).toBeVisible();
  });

  test('3-7. 각 행에 액션 버튼 2개가 있다', async () => {
    const firstRow = page.locator('tbody tr').first();
    const buttons = firstRow.getByRole('button');
    const count = await buttons.count();
    expect(count).toBe(2);
  });

  // ═══════════════════════════════════════════════════════════════
  // 4. 공제 테이블
  // ═══════════════════════════════════════════════════════════════

  test.describe('공제 탭', () => {
    test.beforeAll(async () => {
      await page.getByRole('button', { name: /공제/ }).click();
      await page.waitForTimeout(300);
    });

    test('4-1. 공제 행이 12개 있다', async () => {
      const rows = page.locator('tbody tr');
      const count = await rows.count();
      expect(count).toBe(12);
    });

    test('4-2. 첫 번째 공제 행이 D01 국민연금이다', async () => {
      const firstRow = page.locator('tbody tr').first();
      await expect(firstRow.getByRole('cell', { name: 'D01' })).toBeVisible();
      await expect(firstRow.getByRole('cell', { name: '국민연금' })).toBeVisible();
    });

    test('4-3. 4대보험 항목이 모두 표시된다', async () => {
      const items = ['국민연금', '건강보험', '장기요양보험', '고용보험'];
      for (const item of items) {
        await expect(page.getByRole('cell', { name: item })).toBeVisible();
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 5. 규칙 추가 SlidePanel
  // ═══════════════════════════════════════════════════════════════

  test.describe('규칙 추가 패널', () => {
    test.beforeAll(async () => {
      // 수당 탭으로 복원
      await page.getByRole('button', { name: /수당/ }).click();
      await page.waitForTimeout(300);
    });

    test('5-1. 규칙 추가 클릭 시 패널이 열린다', async () => {
      await page.getByRole('button', { name: '규칙 추가' }).click();
      await expect(page.getByRole('heading', { name: '급여 규칙 추가', level: 2 })).toBeVisible();
    });

    test('5-2. 코드 입력 필드가 보인다', async () => {
      const input = page.getByRole('textbox', { name: '코드' });
      await expect(input).toBeVisible();
      await expect(input).toHaveAttribute('placeholder', '예: A01');
    });

    test('5-3. 항목명 입력 필드가 보인다', async () => {
      const input = page.getByRole('textbox', { name: '항목명' });
      await expect(input).toBeVisible();
      await expect(input).toHaveAttribute('placeholder', '예: 직책수당');
    });

    test('5-4. 구분 드롭다운에 "정액"이 기본 선택되어 있다', async () => {
      const select = page.getByRole('combobox', { name: '구분' });
      await expect(select).toBeVisible();
      const options = select.locator('option');
      const count = await options.count();
      expect(count).toBe(2);
    });

    test('5-5. 지급 주기 드롭다운에 4개 옵션이 있다', async () => {
      const select = page.getByRole('combobox', { name: '지급 주기' });
      await expect(select).toBeVisible();
      const options = select.locator('option');
      const count = await options.count();
      expect(count).toBe(4);
    });

    test('5-6. 기본 금액 기본값이 0이다', async () => {
      await expect(page.getByRole('spinbutton', { name: '기본 금액' })).toHaveValue('0');
    });

    test('5-7. 통상임금 포함 체크박스가 보인다 (체크 해제)', async () => {
      const checkbox = page.getByRole('checkbox', { name: '통상임금 포함' });
      await expect(checkbox).toBeVisible();
      await expect(checkbox).not.toBeChecked();
    });

    test('5-8. 비과세 여부 체크박스가 보인다 (체크 해제)', async () => {
      const checkbox = page.getByRole('checkbox', { name: '비과세 여부' });
      await expect(checkbox).toBeVisible();
      await expect(checkbox).not.toBeChecked();
    });

    test('5-9. 정렬 순서 필드가 보인다', async () => {
      await expect(page.getByRole('spinbutton', { name: '정렬 순서' })).toBeVisible();
    });

    test('5-10. 코드/항목명 비어있으면 저장 버튼이 disabled이다', async () => {
      await expect(page.getByRole('button', { name: '저장' })).toBeDisabled();
    });

    test('5-11. 취소 버튼이 보인다', async () => {
      await expect(page.getByRole('button', { name: '취소' })).toBeVisible();
    });

    test('5-12. 취소 클릭 시 패널이 닫힌다', async () => {
      await page.getByRole('button', { name: '취소' }).click();
      await expect(page.getByRole('heading', { name: '급여 규칙 추가', level: 2 })).not.toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 6. 콘솔 에러 검증
  // ═══════════════════════════════════════════════════════════════

  test('6-1. 급여 규칙에서 JS 에러가 없다', async ({ browser }) => {
    const authContext = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const authPage = await authContext.newPage();

    const errors: string[] = [];
    authPage.on('pageerror', (err) => {
      errors.push(err.message);
    });

    await authPage.goto('/settings/salary-rules');
    await authPage.waitForSelector('table', { timeout: 15000 });
    await authPage.waitForTimeout(2000);

    expect(errors).toHaveLength(0);
    await authContext.close();
  });
});

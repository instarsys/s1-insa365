import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import path from 'path';

const STORAGE_STATE_PATH = path.join(__dirname, '.auth-state.json');

test.describe.serial('근태 관리 E2E 테스트', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context.close();
  });

  // ═══════════════════════════════════════════════════════════════
  // 1. 달력형 근태 (/attendance/calendar)
  // ═══════════════════════════════════════════════════════════════

  test.describe('달력형 근태', () => {
    test.beforeAll(async () => {
      await page.goto('/attendance/calendar');
      await page.waitForTimeout(3000);
    });

    // ─── 1-1. 페이지 헤더 ──────────────────────────────────────

    test('1-1. 제목 "달력형 근태"가 보인다', async () => {
      await expect(page.getByRole('heading', { name: '달력형 근태' })).toBeVisible();
    });

    test('1-2. 부제목이 보인다', async () => {
      await expect(page.locator('text=월간 전직원 출퇴근 현황을 달력 형태로 확인합니다.')).toBeVisible();
    });

    test('1-3. 출퇴근기록 추가 버튼이 보인다', async () => {
      await expect(page.getByRole('button', { name: '출퇴근기록 추가' })).toBeVisible();
    });

    // ─── 1-2. 필터 ────────────────────────────────────────────

    test('1-4. 연도 드롭다운이 보인다', async () => {
      const yearSelect = page.locator('main').getByRole('combobox').first();
      await expect(yearSelect).toBeVisible();
      const selectedOption = await yearSelect.inputValue();
      expect(selectedOption).toBe(String(new Date().getFullYear()));
    });

    test('1-5. 월 드롭다운이 보이고 현재 월이 선택되어 있다', async () => {
      const monthSelect = page.locator('main').getByRole('combobox').nth(1);
      await expect(monthSelect).toBeVisible();
      const currentMonth = String(new Date().getMonth() + 1);
      const selectedOption = await monthSelect.inputValue();
      expect(selectedOption).toBe(currentMonth);
    });

    test('1-6. 부서 드롭다운에 부서 목록이 있다', async () => {
      const deptSelect = page.locator('main').getByRole('combobox').nth(2);
      await expect(deptSelect).toBeVisible();
      const options = deptSelect.locator('option');
      const count = await options.count();
      expect(count).toBeGreaterThanOrEqual(2); // 전체 부서 + 최소 1개 부서
    });

    test('1-7. 활성/퇴직 직원 필터가 보인다', async () => {
      const statusSelect = page.locator('main').getByRole('combobox').nth(3);
      await expect(statusSelect).toBeVisible();
    });

    test('1-8. 지각범위 필터가 보인다', async () => {
      const lateSelect = page.locator('main').getByRole('combobox').nth(4);
      await expect(lateSelect).toBeVisible();
    });

    test('1-9. 조퇴범위 필터가 보인다', async () => {
      const earlySelect = page.locator('main').getByRole('combobox').nth(5);
      await expect(earlySelect).toBeVisible();
    });

    // ─── 1-3. 달력 그리드 또는 빈 상태 ────────────────────────

    test('1-10. 달력 테이블 또는 빈 상태가 보인다', async () => {
      const hasTable = await page.locator('table').count() > 0;
      const hasEmpty = await page.locator('text=해당 월에 근태 기록이 없습니다').count() > 0;
      expect(hasTable || hasEmpty).toBe(true);
    });

    test('1-11. 달력 테이블이 있으면 직원 열 헤더가 보인다', async () => {
      const hasTable = await page.locator('table').count() > 0;
      if (hasTable) {
        await expect(page.locator('th:has-text("직원")').first()).toBeVisible();
      }
    });

    test('1-12. 달력 테이블이 있으면 합계 열 헤더가 보인다', async () => {
      const hasTable = await page.locator('table').count() > 0;
      if (hasTable) {
        await expect(page.locator('th:has-text("합계")').first()).toBeVisible();
      }
    });

    test('1-13. 달력 테이블이 있으면 합계 행이 보인다', async () => {
      const hasTable = await page.locator('table').count() > 0;
      if (hasTable) {
        await expect(page.locator('td:has-text("합계")').first()).toBeVisible();
      }
    });

    // ─── 1-4. 모달 ──────────────────────────────────────────

    test('1-14. 출퇴근기록 추가 버튼 클릭 시 모달이 열린다', async () => {
      await page.getByRole('button', { name: '출퇴근기록 추가' }).click();
      await expect(page.getByRole('heading', { name: '출퇴근기록 추가' })).toBeVisible();
    });

    test('1-15. 모달에 날짜 입력이 보인다', async () => {
      await expect(page.locator('input[type="date"]').last()).toBeVisible();
    });

    test('1-16. 모달에 출근 시간 입력이 보인다', async () => {
      await expect(page.locator('input[type="time"]').first()).toBeVisible();
    });

    test('1-17. 모달에 퇴근 시간 입력이 보인다', async () => {
      await expect(page.locator('input[type="time"]').last()).toBeVisible();
    });

    test('1-18. 모달에 저장 버튼이 보인다', async () => {
      await expect(page.getByRole('button', { name: '저장' })).toBeVisible();
    });

    test('1-19. 모달에 닫기 버튼이 보인다', async () => {
      await expect(page.getByRole('button', { name: '닫기' })).toBeVisible();
    });

    test('1-20. 모달 닫기 시 모달이 사라진다', async () => {
      await page.getByRole('button', { name: '닫기' }).click();
      await expect(page.getByRole('heading', { name: '출퇴근기록 추가' })).not.toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 2. 목록형 근태 (/attendance/records)
  // ═══════════════════════════════════════════════════════════════

  test.describe('목록형 근태', () => {
    test.beforeAll(async () => {
      await page.goto('/attendance/records');
      await page.waitForTimeout(3000);
    });

    // ─── 2-1. 페이지 헤더 ──────────────────────────────────────

    test('2-1. 제목 "목록형 근태"가 보인다', async () => {
      await expect(page.getByRole('heading', { name: '목록형 근태' })).toBeVisible();
    });

    test('2-2. 부제목이 보인다', async () => {
      await expect(page.locator('text=출퇴근 기록을 상세 리스트로 조회합니다.')).toBeVisible();
    });

    test('2-3. 출퇴근기록 추가 버튼이 보인다', async () => {
      await expect(page.getByRole('button', { name: '출퇴근기록 추가' })).toBeVisible();
    });

    // ─── 2-2. 필터 ────────────────────────────────────────────

    test('2-4. 시작일 날짜 입력이 보인다', async () => {
      const dateInputs = page.locator('input[type="date"]');
      await expect(dateInputs.first()).toBeVisible();
    });

    test('2-5. 종료일 날짜 입력이 보인다', async () => {
      const dateInputs = page.locator('input[type="date"]');
      await expect(dateInputs.nth(1)).toBeVisible();
    });

    test('2-6. 부서 드롭다운이 보인다', async () => {
      const deptSelect = page.locator('main').getByRole('combobox').first();
      await expect(deptSelect).toBeVisible();
    });

    test('2-7. 상태 드롭다운이 보인다', async () => {
      const statusSelect = page.locator('main').getByRole('combobox').nth(1);
      await expect(statusSelect).toBeVisible();
    });

    test('2-8. 직원 검색 입력이 보인다', async () => {
      await expect(page.getByPlaceholder('직원 검색')).toBeVisible();
    });

    // ─── 2-3. 테이블 또는 빈 상태 ────────────────────────────

    test('2-9. 테이블 또는 빈 상태가 보인다', async () => {
      const hasTable = await page.locator('table').count() > 0;
      const hasEmpty = await page.locator('text=해당 기간에 근태 기록이 없습니다').count() > 0;
      expect(hasTable || hasEmpty).toBe(true);
    });

    // ─── 2-4. 모달 ──────────────────────────────────────────

    test('2-10. 출퇴근기록 추가 버튼 클릭 시 모달이 열린다', async () => {
      await page.getByRole('button', { name: '출퇴근기록 추가' }).click();
      await expect(page.getByRole('heading', { name: '출퇴근기록 추가' })).toBeVisible();
    });

    test('2-11. 모달에 저장/닫기 버튼이 보인다', async () => {
      await expect(page.getByRole('button', { name: '저장' })).toBeVisible();
      await expect(page.getByRole('button', { name: '닫기' })).toBeVisible();
    });

    test('2-12. 모달 닫기 시 모달이 사라진다', async () => {
      await page.getByRole('button', { name: '닫기' }).click();
      await expect(page.getByRole('heading', { name: '출퇴근기록 추가' })).not.toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 3. 휴가 관리 (/attendance/leave)
  // ═══════════════════════════════════════════════════════════════

  test.describe('휴가 관리', () => {
    test.beforeAll(async () => {
      await page.goto('/attendance/leave');
      await page.waitForTimeout(2000);
    });

    test('3-1. 제목 "휴가 관리"가 보인다', async () => {
      await expect(page.getByRole('heading', { name: '휴가 관리' })).toBeVisible();
    });

    test('3-2. 부제목이 보인다', async () => {
      await expect(page.locator('text=휴가 신청을 승인/반려합니다.')).toBeVisible();
    });

    test('3-3. 대기 탭에 카운트가 표시된다', async () => {
      await expect(page.getByRole('button', { name: /대기 \d+/ })).toBeVisible();
    });

    test('3-4. 전체 탭이 보인다', async () => {
      await expect(page.getByRole('button', { name: '전체' })).toBeVisible();
    });

    test('3-5. 대기 신청 없을 때 빈 상태 메시지가 보인다', async () => {
      await expect(page.getByRole('heading', { name: '대기 중인 휴가 신청이 없습니다' })).toBeVisible();
    });

    test('3-6. 빈 상태 부가 설명이 보인다', async () => {
      await expect(page.locator('text=직원이 휴가를 신청하면 여기에 표시됩니다.')).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 4. 52시간 모니터링 (/attendance/overtime)
  // ═══════════════════════════════════════════════════════════════

  test.describe('52시간 모니터링', () => {
    test.beforeAll(async () => {
      await page.goto('/attendance/overtime');
      await page.waitForTimeout(2000);
    });

    test('4-1. 제목 "52시간 모니터링"이 보인다', async () => {
      await expect(page.getByRole('heading', { name: '52시간 모니터링' })).toBeVisible();
    });

    test('4-2. 부제목이 보인다', async () => {
      await expect(page.locator('text=주 52시간 초과 위험 직원을 모니터링합니다.')).toBeVisible();
    });

    test('4-3. 데이터 없을 때 빈 상태 메시지가 보인다', async () => {
      await expect(page.getByRole('heading', { name: '금주 근무 기록이 없습니다' })).toBeVisible();
    });

    test('4-4. 빈 상태 부가 설명이 보인다', async () => {
      await expect(page.locator('text=직원들의 출퇴근 기록이 쌓이면 52시간 현황이 표시됩니다.')).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 5. 사이드바 메뉴 확인
  // ═══════════════════════════════════════════════════════════════

  test.describe('사이드바 메뉴', () => {
    test('5-1. 근태 관리 하위에 달력형 메뉴가 보인다', async () => {
      await page.goto('/attendance/calendar');
      await page.waitForTimeout(1000);
      await expect(page.locator('nav a:has-text("달력형")')).toBeVisible();
    });

    test('5-2. 근태 관리 하위에 목록형 메뉴가 보인다', async () => {
      await expect(page.locator('nav a:has-text("목록형")')).toBeVisible();
    });

    test('5-3. 이전 메뉴 (일별 근태/월별 현황)는 보이지 않는다', async () => {
      await expect(page.locator('nav a:has-text("일별 근태")')).not.toBeVisible();
      await expect(page.locator('nav a:has-text("월별 현황")')).not.toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 6. 리다이렉트 확인
  // ═══════════════════════════════════════════════════════════════

  test('6-1. /attendance 접근 시 /attendance/calendar로 리다이렉트된다', async () => {
    await page.goto('/attendance');
    await page.waitForURL('**/attendance/calendar', { timeout: 10000 });
    expect(page.url()).toContain('/attendance/calendar');
  });

  // ═══════════════════════════════════════════════════════════════
  // 7. 콘솔 에러 검증
  // ═══════════════════════════════════════════════════════════════

  test('7-1. 달력형 근태에서 JS 에러가 없다', async ({ browser }) => {
    const authContext = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const authPage = await authContext.newPage();

    const errors: string[] = [];
    authPage.on('pageerror', (err) => {
      if (!err.message.includes('Hydration')) errors.push(err.message);
    });

    await authPage.goto('/attendance/calendar');
    await authPage.waitForTimeout(3000);

    expect(errors).toHaveLength(0);
    await authContext.close();
  });

  test('7-2. 목록형 근태에서 JS 에러가 없다', async ({ browser }) => {
    const authContext = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const authPage = await authContext.newPage();

    const errors: string[] = [];
    authPage.on('pageerror', (err) => {
      if (!err.message.includes('Hydration')) errors.push(err.message);
    });

    await authPage.goto('/attendance/records');
    await authPage.waitForTimeout(3000);

    expect(errors).toHaveLength(0);
    await authContext.close();
  });
});

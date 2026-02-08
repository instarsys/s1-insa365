import { test as setup } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const EMPLOYEE_EMAIL = 'kim.ys@test-company.com';
const EMPLOYEE_PASSWORD = 'test1234!';
const STORAGE_STATE_PATH = path.join(__dirname, '.employee-auth-state.json');

setup('직원 로그인 후 인증 상태 저장', async ({ page }) => {
  if (fs.existsSync(STORAGE_STATE_PATH)) {
    const stat = fs.statSync(STORAGE_STATE_PATH);
    const ageMs = Date.now() - stat.mtimeMs;
    if (ageMs < 5 * 60 * 1000) {
      return;
    }
  }

  await page.goto('/login');
  await page.getByRole('textbox', { name: '이메일' }).fill(EMPLOYEE_EMAIL);
  await page.getByRole('textbox', { name: '비밀번호' }).fill(EMPLOYEE_PASSWORD);
  await page.getByRole('button', { name: '로그인' }).click();
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await page.context().storageState({ path: STORAGE_STATE_PATH });
});

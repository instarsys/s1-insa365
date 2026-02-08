import { test as setup } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SYSADMIN_EMAIL = 'sysadmin@insa365.com';
const SYSADMIN_PASSWORD = 'sysadmin123!';
const STORAGE_STATE_PATH = path.join(__dirname, '.super-admin-auth-state.json');

setup('Super Admin 로그인 후 인증 상태 저장', async ({ page }) => {
  if (fs.existsSync(STORAGE_STATE_PATH)) {
    const stat = fs.statSync(STORAGE_STATE_PATH);
    const ageMs = Date.now() - stat.mtimeMs;
    if (ageMs < 5 * 60 * 1000) {
      return;
    }
  }

  await page.goto('/super-admin/login');
  await page.fill('input[type="email"]', SYSADMIN_EMAIL);
  await page.fill('input[type="password"]', SYSADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/super-admin/dashboard', { timeout: 15000 });
  await page.context().storageState({ path: STORAGE_STATE_PATH });
});

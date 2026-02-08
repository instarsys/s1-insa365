import { defineConfig } from '@playwright/test';
import path from 'path';

const STORAGE_STATE_PATH = path.join(__dirname, 'e2e', '.auth-state.json');
const SUPER_ADMIN_STORAGE_STATE_PATH = path.join(__dirname, 'e2e', '.super-admin-auth-state.json');
const EMPLOYEE_STORAGE_STATE_PATH = path.join(__dirname, 'e2e', '.employee-auth-state.json');

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'setup',
      testMatch: 'auth.setup.ts',
    },
    {
      name: 'super-admin-setup',
      testMatch: /super-admin-auth\.setup\.ts/,
    },
    {
      name: 'employee-setup',
      testMatch: /employee-auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        storageState: STORAGE_STATE_PATH,
      },
      dependencies: ['setup'],
      testMatch: /\.spec\.ts$/,
      testIgnore: [/super-admin-/, /employee-/],
    },
    {
      name: 'super-admin',
      use: {
        browserName: 'chromium',
        storageState: SUPER_ADMIN_STORAGE_STATE_PATH,
      },
      dependencies: ['super-admin-setup'],
      testMatch: /super-admin-.*\.spec\.ts/,
    },
    {
      name: 'employee',
      use: {
        browserName: 'chromium',
        storageState: EMPLOYEE_STORAGE_STATE_PATH,
      },
      dependencies: ['employee-setup'],
      testMatch: /employee-(?!auth).*\.spec\.ts/,
    },
  ],
  // dev 서버는 이미 별도 터미널에서 실행 중이므로 webServer 설정 생략
});

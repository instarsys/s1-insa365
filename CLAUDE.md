# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**s1-insa365** is a Korean payroll automation SaaS for SMEs (50-300 employees). It automates 4 social insurances (4대보험), income tax via simplified tax tables (간이세액표), overtime/night/holiday pay premiums, and 52-hour workweek compliance. This is the v2 rewrite (s1) incorporating lessons from s0-insa365.

The product vision: "Korean SME payroll in 3 minutes." Three core modules: Employee Management, Attendance Management, Salary Auto-calculation.

## SaaS Business Model (비즈니스 모델)

### 서비스 구조
- **회사관리자(COMPANY_ADMIN)** 가 서비스에 가입 → 회사(tenant) 생성
- 직원(MANAGER/EMPLOYEE)을 추가하여 인사/근태/급여 관리
- 직원 1명 추가 시 플랜별 인당 요금 발생 (월 과금)

### 플랜 및 과금 (`src/app/api/billing/plan/route.ts`)

| 플랜 | 인당 월 요금 | 최대 직원 수 | 비고 |
|------|------------|------------|------|
| TRIAL | 0원 | 5명 | 30일 무료 체험 |
| STARTER | 2,000원 | 50명 | SME 기본 |
| PRO | 3,500원 | 300명 | 확장 기능 |

- 기본료 없음, 순수 인당 과금
- 전월 말일 활성 직원 수 기준, 월 1일 결제
- 퇴사자는 당월까지 과금

### 역할별 사용 경험

| 역할 | 플랫폼 | 주요 기능 |
|------|--------|---------|
| COMPANY_ADMIN | 데스크톱 웹 | 회사 설정, 직원 관리, 근태 확정, 급여 계산/확정, 플랜/결제 관리 |
| MANAGER | 데스크톱 웹 | 부서 범위 근태/직원 읽기, 휴가 승인 |
| EMPLOYEE | 모바일 PWA | GPS 출퇴근, 휴가 신청, 급여명세서 조회, 프로필 관리 |

### 결제 시스템 구현 상태
- **Prisma 모델**: `Subscription`, `Payment` (enum: SubscriptionPlan, SubscriptionStatus, PaymentStatus)
- **API**: `/api/billing` (GET), `/api/billing/plan` (PUT), `/api/billing/card` (POST/DELETE), `/api/billing/payments` (GET)
- **UI**: `/settings/billing` 페이지 (플랜 선택, 카드 등록, 결제 이력)
- **SWR 훅**: `useBilling()`, `usePaymentHistory()`, `useBillingMutations()`
- **미완성**: 토스페이먼츠 SDK 연동 (현재 모의 구현), 직원 생성 시 플랜 제한 검증, 자동 월별 과금 배치

## Clean Architecture (필수) — 코딩 규칙

모든 백엔드 코드는 Clean Architecture 레이어 구조를 따른다:

```
src/
├── domain/           # Enterprise Business Rules (순수 TypeScript, 외부 의존성 없음)
│   ├── entities/     # Employee, SalaryCalculation, Attendance 등
│   ├── value-objects/ # Money, EmployeeNumber, DateRange 등
│   └── errors/       # DomainError 계층
├── application/      # Application Business Rules (UseCase 패턴)
│   ├── use-cases/    # CalculatePayroll, ConfirmAttendance, ApproveLeave 등
│   ├── ports/        # Repository interfaces (input/output ports)
│   └── dtos/         # Request/Response DTOs
├── infrastructure/   # Frameworks & Drivers
│   ├── persistence/  # Prisma repositories (implements ports)
│   ├── di/           # DI 컨테이너 (container.ts)
│   ├── queue/        # BullMQ job processors
│   ├── encryption/   # AES-256-GCM service
│   ├── auth/         # JWT token, password hashing services
│   ├── excel/        # Excel import/export service
│   ├── invite/       # 합류초대 코드 생성 service
│   ├── email/        # 이메일 발송 service
│   ├── audit/        # 감사 로그 service
│   └── external/     # 외부 API 연동
└── presentation/     # Interface Adapters
    ├── api/          # Next.js API Route handlers
    └── middleware/    # Auth, tenant isolation, rate limiting
```

의존성 방향: presentation → application → domain ← infrastructure
domain 레이어는 어떤 외부 라이브러리에도 의존하지 않는다.
급여 계산 핵심 로직(Phase 0~5)은 반드시 domain/application 레이어에 위치.

### API Route 필수 패턴 (반드시 준수)

모든 API Route에서 DB 접근은 **반드시** DI 컨테이너(`getContainer()`)를 통해서만 수행한다:

```typescript
// ✅ 올바른 패턴: getContainer()를 통한 Repository/UseCase 접근
import { getContainer } from '@/infrastructure/di/container';

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  const { employeeRepo } = getContainer();
  const data = await employeeRepo.findAll(user.companyId, filters);
  return NextResponse.json(data);
}

// ✅ UseCase를 통한 비즈니스 로직 실행
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  const { calculatePayrollUseCase } = getContainer();
  const result = await calculatePayrollUseCase.execute({ companyId: user.companyId, ...body });
  return NextResponse.json(result);
}

// ✅ Infrastructure Service를 통한 인프라 기능 접근
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  const { excelService, auditLogService } = getContainer();
  const result = await excelService.exportEmployees(user.companyId);
  await auditLogService.log({ userId: user.id, action: 'EXPORT', entity: 'Employee' });
  return NextResponse.json(result);
}
```

### API 응답 평탄화 규칙

프론트엔드가 `item.userName` 같은 평탄 필드를 기대하면, **API Route에서 DTO 변환** (nested → flat):
```typescript
// ✅ Repository가 nested 객체를 반환하더라도 API에서 평탄화
items: result.items.map(item => ({
  ...item,
  userName: item.user?.name ?? '',
  departmentName: item.user?.department?.name ?? '',
})),
```
**교훈**: `item.user.name` (nested) vs `item.userName` (flat) 불일치로 빈 셀 버그 발생 (`e404f57`).

### 프론트엔드 에러 핸들링 필수 패턴

비동기 함수의 catch 블록에서 반드시 서버 에러 메시지를 토스트로 표시:
```typescript
// ✅ 올바른 패턴: 서버 에러 메시지 활용
} catch (err) {
  toast.error(err instanceof Error ? err.message : '처리에 실패했습니다.');
}

// ❌ 금지: 에러 메시지 무시하고 하드코딩
} catch {
  toast.error('처리에 실패했습니다.');
}
```
**교훈**: 서버가 상세 에러 메시지("해당 기간에 근태 기록이 존재하여...")를 반환해도 프론트에서 무시하면 사용자가 실패 원인을 알 수 없음 (`b1236ab`).

### UseCase 에러 메시지 한국어 필수

UseCase의 `ValidationError`, `EntityNotFoundError` 메시지는 **반드시 한국어**로 작성. API → 프론트엔드 토스트까지 그대로 전달되므로 영어 메시지가 사용자에게 노출됨.
```typescript
// ✅ 올바른 패턴
throw new ValidationError('해당 기간의 급여가 이미 확정되었습니다.');

// ❌ 금지: 영어 메시지
throw new ValidationError('Payroll for this period is already confirmed');
```

### 절대 금지 패턴 (위반 시 즉시 수정)

```typescript
// ❌ 절대 금지: API Route에서 prisma 직접 import
import { prisma } from '@/infrastructure/persistence/prisma/client';

// ❌ 절대 금지: API Route에서 prisma 직접 호출
const data = await prisma.user.findMany({ where: { companyId } });
const employee = await prisma.employee.create({ data: { ... } });

// ❌ 절대 금지: API Route에서 getPrismaForTenant 직접 호출
const tenantPrisma = getPrismaForTenant(companyId);
const data = await tenantPrisma.user.findMany();

// ❌ 절대 금지: API Route에서 Infrastructure Service 직접 import
import { ExcelService } from '@/infrastructure/excel/ExcelService';
import { AuditLogService } from '@/infrastructure/audit/AuditLogService';
const excelService = new ExcelService();  // DI 컨테이너 우회
```

**교훈**: 프로젝트 초기에 "클린 아키텍처 필수"라는 추상적 원칙만 기술하고 구체적 금지/필수 패턴을 명시하지 않아, 80개 API 라우트에서 prisma를 직접 호출하는 코드가 생성됨. 이후 104개 파일 대규모 리팩토링이 필요했음 (커밋 `c28fa9a`).

### 새 API Route 생성 시 체크리스트

1. 필요한 Repository 메서드가 `src/infrastructure/persistence/repositories/`에 있는지 확인
2. 없으면 Repository 클래스에 메서드 추가
3. 새 Repository인 경우 → `src/infrastructure/di/container.ts`에 import + 인스턴스 생성 + export 추가
4. API Route에서 `const { xxxRepo } = getContainer();`로 접근
5. Infrastructure Service 필요 시 → `const { xxxService } = getContainer();`로 접근
6. **최종 확인**: 해당 파일에 `prisma`나 Infrastructure Service를 직접 import하는 코드가 없는지 검증

### DI 컨테이너 (`src/infrastructure/di/container.ts`)

- **싱글톤 패턴**: 31개 Repository + 46개 Use Case + 7개 Infrastructure Service를 한 곳에서 관리
- **의존성 주입**: Use Case 생성 시 필요한 Repository/Service를 생성자로 주입
- **새 Repository 추가 절차**:
  1. `src/infrastructure/persistence/repositories/XxxRepository.ts` 클래스 생성
  2. `container.ts`에 import → 인스턴스 생성 → `getContainer()` 반환 객체에 추가
- **새 Use Case 추가 절차**:
  1. `src/application/use-cases/XxxUseCase.ts` 클래스 생성
  2. `container.ts`에 import → Repository 의존성 주입하며 인스턴스 생성 → export
- **새 Infrastructure Service 추가 절차**:
  1. `src/infrastructure/{domain}/XxxService.ts` 클래스 생성 (예: `auth/`, `excel/`, `audit/`)
  2. `container.ts`에 import → 인스턴스 생성 → `getContainer()` 반환 객체에 추가

### DI 예외 (2개만 허용)

- **`auth/signup`**: 회사 + 사용자 + 시드 데이터(부서/직급/급여규칙/근로정책 등)를 `$transaction`으로 원자적 생성하는 복합 트랜잭션. 단일 Repository로 분리하기 어려워 현재 상태 유지. (단, 대부분의 로직은 DI 컨테이너 경유로 전환 완료)
- **`api/health`**: 단순 헬스체크 엔드포인트. DB 접근 없이 200 OK 반환.

---

## Technology Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Next.js 16 (App Router) + React Server Components | SWR for client data fetching |
| Backend | Next.js API Routes + **Clean Architecture (필수)** | UseCase 패턴, Domain/Application/Infrastructure 레이어 분리 |
| ORM | Prisma | Type-safe queries, auto-migration |
| Database | PostgreSQL + RLS | Row-Level Security for tenant isolation |
| Batch Processing | BullMQ + Redis | Payroll batch calc, PDF generation queue |
| File Storage | S3-compatible object storage (Cloudflare R2) | presigned URL upload, UUID filenames |
| Monitoring | Sentry | Error tracking + performance monitoring |
| Auth | JWT (Access 1hr + Refresh 7d) + bcrypt | See Auth section |
| Infra | AWS (EC2/ECS + RDS PostgreSQL + ElastiCache Redis) | 다른 프로젝트와 AWS 통합 운영 |

## Architecture Principles (from PRD/MVP)

These are hard requirements derived from s0 lessons — violating them caused production bugs:

- **All tax/insurance rates in DB, never hardcoded** — s0 broke when rates changed yearly because frontend had hardcoded values. All calculations must call backend APIs that read from `InsuranceRate` and `TaxBracket` tables.
- **Single salary data source** — Employee salary data lives only in `EmployeeSalaryItem`. s0 had dual management (User.baseSalary + EmployeeSalaryItem) causing inconsistencies.
- **Attendance-to-payroll via snapshots** — Confirmed attendance generates a versioned `SalaryAttendanceData` snapshot. Payroll calculates from snapshots, never live attendance data.
- **Multi-tenancy via companyId (구현 완료)** — Every DB query must filter by `companyId`. JWT tokens carry `companyId`. 24 Repositories, 68 write 메서드 전부 companyId 검증 완비 (100%). `findFirst({ id, companyId })` before `update`/`softDelete`/`delete` (returns null on mismatch). Refresh token에 JWT↔DB companyId 교차 검증 추가.
- **Soft delete everywhere** — Use `deletedAt` field, never hard delete. Korean labor law requires 3-year data retention.
- **PII encryption** — Resident registration numbers (주민등록번호) use AES-256-GCM encryption.
- **DB-level tenant isolation (RLS) (구현 완료)** — PostgreSQL RLS on 17 tenant tables via `current_setting('app.company_id')` + `FORCE ROW LEVEL SECURITY` (table owner도 RLS 적용). `getPrismaForTenant(companyId)` extension auto-injects companyId (incremental adoption). `setTenantContext()` UUID 형식 검증으로 SQL injection 방어. Defense-in-depth: application code + DB policy both enforce isolation. Global tables (companies, insurance_rates, tax_brackets, tax_exempt_limits, minimum_wages, legal_parameters) excluded from RLS.
- **PII field-level encryption** — Both 주민등록번호 AND 계좌번호 use AES-256-GCM. Decryption requires `canViewSensitive` permission flag. All PII access logged to AuditLog (개인정보보호법 compliance).
- **Async batch processing** — Payroll batch calculation (300+ employees) runs via BullMQ job queue, not synchronous API. Frontend polls progress via status endpoint. PDF bulk generation also queued.
- **Calculation snapshot immutability** — SalaryCalculation stores the tax/insurance rates used at calculation time. Recalculation uses original rates, not current rates. Insurance rates are date-range based (not yearly) to handle mid-year changes.
- **File storage security** — Sensitive documents (급여명세서 PDF, 통장사본) encrypted at rest. presigned URLs with short expiry (5min for sensitive docs). UUID-based filenames (no PII in paths). Download events logged to AuditLog.

## Data Model (Key Entities)

```
Company ──1:N── Department, WorkPolicy, WorkLocation, SalaryRule
Company ──1:N── User (Employee)
User ──1:N── Attendance, EmployeeSalaryItem, SalaryCalculation
Attendance ──1:N── AttendanceSegment

Standalone reference tables: InsuranceRate (date-range based), TaxBracket (yearly), TaxExemptLimit (yearly), PayrollMonthly (monthly history), MinimumWage (yearly), LegalParameter (key-value), AuditLog (change history)
```

Key relationships:
- `SalaryRule` (company-level template) → copied to `EmployeeSalaryItem` (per-employee) on hire
- Employee number format: `E{A-Z}{0000-9999}` (e.g., EA1234)
- Salary workflow: `DRAFT → CONFIRMED → PAID` (also `FAILED` for calculation errors, `SKIPPED` for skip)
- Payroll confirmation (CONFIRMED) auto-generates 급여대장 (payroll ledger) + 급여명세서

## Payroll Workflow (End-to-End)

```
[Daily] Employee: GPS clock-in/out + Leave request (기본 휴가 MVP)
[Ad-hoc] Manager: Approve/reject leave requests
[Month-end]
  (1) Manager: Review attendance + approve pending leave
  (2) Manager: "일괄 확정" (bulk confirm) → SalaryAttendanceData snapshot created
      - "확정 취소" → 급여 CONFIRMED 시 연쇄 취소(급여→근태), PAID 시 취소 불가
      - POST /api/attendance/cancel → 급여 상태 확인 + 확정 해제 + 자동 결근 삭제 + 스냅샷 삭제
  (3) [Step 1: 스프레드시트 급여 입력] → Spreadsheet UI with inline editing
      - Salaried: auto-populated, Hourly: attendance-linked + manual override
      - Variable allowances direct input, Employee Skip for leave/unpaid
  (4) [Step 2: Review Summary] → Total pay/deductions/net, MoM comparison, drill-down
  (5) [Step 3: Confirm] → 3 hero summary cards (총지급/총공제/총실수령) + expandable dept breakdown → DRAFT → CONFIRMED, 24h cancel window
      → Auto-generates: 급여대장 (payroll ledger) + 급여명세서 (pay stubs)
```

Basic Leave Management (MVP): 6 leave types (연차/반차/병가/경조사/무급휴가/기타), manual remaining days, approval/rejection. Phase 2 adds auto annual leave calculation.

## Global Menu Structure (Sidebar Navigation)

```
Admin (sidebar): 대시보드 (To-do + widgets) → 직원 관리 → 근태 관리 (달력형/목록형/52시간) → 휴가 관리 (휴가 관리/휴가 발생) → 급여 관리 (급여 실행/이력/급여대장/명세서)
→ 세무/신고 → 리포트 (4 basic reports in MVP) → 설정
AdminTopBar: 로고 + 글로벌 검색 (Cmd+K, 직원/메뉴 fuzzy) + 알림 벨 + 회사명 + 프로필 아바타

Super Admin Console (/super-admin/*): 별도 URL, 레이아웃, 로그인 (SYSTEM_ADMIN 전용)
  대시보드 (시스템 헬스) → 법정 파라미터 (5탭) → 감사 로그 → 테넌트 관리 → 사용자 관리 → 플랜 관리
  로그인: /super-admin/login (sysadmin@insa365.com), 인디고/슬레이트 테마
  SuperAdminTopBar: "s1-insa365 System Admin" 로고 + 프로필 아바타/로그아웃 (검색/알림 없음)

EMPLOYEE (mobile PWA): 하단 탭바 — 홈(출퇴근+알림) / 근태(근무시간) / 휴가(신청+잔여) / 급여(명세서) / MY(프로필)
```
**주의**: `(admin)` 디렉토리는 Next.js route group으로 URL에 포함되지 않음. API 응답의 link 경로에 `/admin` 접두사를 절대 넣지 말 것 (예: `/attendance/leave` ✅, `/admin/attendance/leave` ❌).

See PRD 4.9 for admin menu tree, PRD 4.11 for employee mobile experience.

## Payroll Calculation Order

```
Phase 0: Data Loading
  - EmployeeSalaryItem, SalaryAttendanceData
  - InsuranceRate, TaxBracket, TaxExemptLimit
  - Company settings

Phase 1: Ordinary Wage Calculation (통상임금 산정) ★
  - MONTHLY: Base salary + allowances where isOrdinaryWage=true
    - Convert bi-monthly/quarterly/annual allowances to monthly
    - ordinaryHourlyWage = monthlyOrdinaryWage / 209
  - HOURLY: ordinaryHourlyWage = hourlyRate (직접 사용)
    - monthlyOrdinaryWage = hourlyRate × 209
  - Minimum wage check (warning if below)

Phase 2: Gross Pay (총 지급액)
  - MONTHLY: basePay = SalaryItem(BASE).amount × prorationRatio
  - HOURLY: basePay = hourlyRate × attendance.regularMinutes / 60
  - + Fixed allowances
  - + Formula allowances (ordinaryHourlyWage-based):
      overtime = ordinaryHourly * 1.5 * overtimeMin/60
      night = ordinaryHourly * 0.5 * nightMin/60
      night+overtime = ordinaryHourly * 2.0 * nightOvertimeMin/60
      holiday(≤8h) = ordinaryHourly * 1.5 * holidayMin_within8h/60
      holiday(>8h) = ordinaryHourly * 2.0 * holidayMin_over8h/60
      holiday+night(≤8h) = ordinaryHourly * 2.0
      holiday+night(>8h) = ordinaryHourly * 2.5
  - + Variable allowances, weekly holiday pay (hourly/daily workers)
  - - Attendance deductions
  - = totalPay

Phase 3: Tax-Exempt Separation (비과세 분리)
  - Apply per-item tax-exempt limits (meals 200K, vehicle 200K, childcare 200K)
  - taxableIncome = totalPay - totalNonTaxable
  - Calculate insurance base amounts

Phase 4: Deductions (공제)
  - NationalPension: clamp(base, min, max) * 4.5% (truncate below 10 KRW)
  - HealthInsurance: base * 3.545% (truncate below 1 KRW)
  - LongTermCare: healthInsurance * 12.95% (truncate below 1 KRW)
  - EmploymentInsurance: base * 0.9% (truncate below 1 KRW)
  - IncomeTax: TaxBracket lookup
  - LocalIncomeTax: incomeTax * 10%
  - Other deductions
  - = totalDeduction

Phase 5: Net Pay
  - netPay = totalPay - totalDeduction
```

Insurance modes per employee: `AUTO` (calculated from base+taxable allowances), `MANUAL` (custom base amount), `NONE` (exempt).

Salary types per employee: `MONTHLY` (월급제, default — basePay from EmployeeSalaryItem BASE amount), `HOURLY` (시급제 — basePay from hourlyRate × regularMinutes / 60).

Attendance exempt per employee: `attendanceExempt` Boolean (default `false`). `true`이면 출퇴근 기록 없이 매월 고정 급여 지급 (임원/대표 등). **시급제(HOURLY)와 동시 설정 불가** — 시급제로 변경 시 서버에서 자동 해제. 근태면제 직원은 급여 계산 시 근태 미확정이어도 SKIPPED 되지 않고 기본급+고정수당만 지급.

## Korean Labor Law Constants

- Standard monthly work hours: 209 hours (hourly rate = baseSalary / 209)
- Ordinary wage (통상임금): base salary + regular/uniform allowances (2024 Supreme Court: "fixedness" requirement abolished)
- Ordinary hourly wage (통상시급) = monthly ordinary wage / 209
- Weekly work limit: 52 hours (40 regular + 12 overtime)
- Warning threshold: 48 hours/week
- Overtime premium: 1.5x ordinary hourly wage
- Night work (22:00-06:00): additional 0.5x ordinary hourly wage
- Overtime + Night: 2.0x ordinary hourly wage
- Holiday work (≤8h): 1.5x, (>8h): 2.0x ordinary hourly wage
- Holiday + Night (≤8h): 2.0x, (>8h): 2.5x ordinary hourly wage
- Weekly holiday pay: for hourly/daily workers working 15+ hours/week
- Tax-free allowances (2025): meals 200,000 KRW/month, vehicle maintenance 200,000 KRW/month, childcare 200,000 KRW/month
- National pension bounds: 2025.1-6: min 390,000, max 6,170,000 / 2025.7-12: min 400,000, max 6,370,000
- Health insurance bounds (2025): min 279,000, max 12,706,000
- Long-term care rate: 12.95% of health insurance (2025)
- Minimum wage: 2025: 10,030 KRW/hour, 2026: 10,320 KRW/hour
- Insurance rounding: NationalPension truncate below 10 KRW; Health/LongTermCare/Employment truncate below 1 KRW

## RBAC Roles

`SYSTEM_ADMIN` > `COMPANY_ADMIN` > `MANAGER` > `EMPLOYEE`

- SYSTEM_ADMIN: 별도 `/super-admin/*` 콘솔 (법정파라미터, 감사로그, 테넌트/사용자/플랜 관리). 회사관리자 사이드바에 노출되지 않음
- COMPANY_ADMIN: full company data access
- MANAGER: department-scoped read access
- EMPLOYEE: own data only

Sensitive data permission:
- `canViewSensitive` flag per user — controls access to 주민등록번호, 계좌번호
- Default: only COMPANY_ADMIN has canViewSensitive=true
- Every PII field access (decrypt) is logged to AuditLog (개인정보보호법 §29)

## Auth

JWT-based: Access Token (1hr) + Refresh Token (7d). Passwords: bcrypt with 10 salt rounds.

**임시비밀번호 + 강제변경 플로우**:
- 직원 생성(`/api/employees` POST) / 합류초대(`/api/auth/join`) 시 임시비밀번호 자동 발급 + `mustChangePassword=true`
- `PasswordChangeGuard` 컴포넌트: admin/employee 레이아웃에서 `mustChangePassword=true`면 `/change-password`로 강제 리다이렉트
- `/change-password` 페이지: 임시비밀번호 사용자는 현재 비밀번호 없이 변경 가능, 일반 변경 시 현재 비밀번호 필수
- 로그인 시 `mustChangePassword=true`면 대시보드 대신 `/change-password`로 분기

**API 에러 처리** (`src/presentation/middleware/withAuth.ts`):
- `withAuth` 래퍼에 try-catch: API 핸들러 예외 시 빈 body 대신 JSON `{ message }` 반환 + 서버 콘솔 에러 로그

**API Client Auth Guard** (`src/lib/api.ts`):
- `handleResponse()` intercepts 401 → attempts `/api/auth/refresh` → on failure redirects to `/login`
- **Auth page exception**: `/login`, `/signup`, `/join`, `/super-admin/login`, `/change-password` 페이지에서는 401 시 refresh/redirect를 스킵하여 무한 새로고침 방지

**useAuth() SWR 키 관리** (`src/hooks/useAuth.ts`):
- **`usePathname()` 필수**: SWR 키 결정에 반드시 Next.js `usePathname()`을 사용. `window.location.pathname` + `useMemo([], [])` 조합 금지 — 클라이언트 사이드 네비게이션 시 stale 값 고정으로 SWR fetch 실행 안 됨
- **`globalMutate` 필수**: `login()`/`signup()` 후 `globalMutate('/api/auth/me', user, { revalidate: true })`로 글로벌 SWR 캐시에 직접 주입. 로그인 페이지의 swrKey가 `null`이므로 bound `mutate()`는 효과 없음
- AUTH_PAGES: `/login`, `/signup`, `/join`, `/super-admin/login`, `/change-password` → swrKey = null (fetch 안 함)

**Middleware** (`src/proxy.ts`):
- Public paths: `/login`, `/signup`, `/join`, `/super-admin/login`, `/change-password`, `/api/auth`, `/api/health`
- Super Admin 경로(`/super-admin/*`)에 미인증 접근 시 → `/super-admin/login`으로 redirect (일반 `/login`이 아님)
- Rate limiting: API 100/min per IP

---

## Seed Data on Company Signup

Auto-created: 5 departments, 5 positions, 1 work policy (09:00-18:00, 60min break), 1 work location, 11 allowance rules (A01-A11), 12 deduction rules (D01-D12), 2 minimum wages (2025-2026), 10 legal parameters (work hours, overtime rates, etc.).

Seed accounts:
- `admin@test-company.com` / `admin123!` — COMPANY_ADMIN (테스트 주식회사)
- `manager@test-company.com` / `manager123!` — MANAGER (테스트 주식회사)
- `sysadmin@insa365.com` / `sysadmin123!` — SYSTEM_ADMIN (s1-insa365 시스템 회사)
- 직원 5명 (월급 4 + 시급 1: 김영수/박지민/이서연/홍파트/조현우, PII 포함)

## Non-Functional Targets

- API P95 < 500ms, batch payroll for 300 employees < 10s
- Test coverage: 80%+ overall, 95%+ for payroll calculation logic
- Security: AES-256-GCM for PII, HTTPS only, rate limiting (login: 5/min, API: 100/min)
- **현재 테스트**: 단위 399개 (vitest) + E2E 612개 (Playwright) + 근태확정 E2E = **1011개+**

## API Caching Strategy (SWR)

| Endpoint Pattern | refreshInterval | Strategy | Rationale |
|-----------------|----------------|----------|-----------|
| /api/payroll/status | 5s | Polling | Batch calc progress tracking |
| /api/employees | 15s | Revalidate on focus + interval | Employee list, moderate change rate |
| /api/attendance/today | 30s | Revalidate on focus + interval | Daily attendance status |
| /api/dashboard/stats | 60s | Revalidate on focus + interval | Aggregate stats, slow changing |
| /api/company/settings | revalidateOnFocus only | Stale-while-revalidate | Rarely changes |
| /api/insurance-rates | revalidateOnFocus only | Stale-while-revalidate | Changes yearly/semi-annually |

Cache invalidation: After mutation, use SWR `mutate()` with key prefix matching to revalidate related caches.

## Audit Log Scope

All auditable actions write to AuditLog with: who (userId), when (timestamp), what (entity+action), before/after JSON diff.

| Category | Audited Actions | Legal Basis |
|----------|----------------|-------------|
| Payroll | Calculate, modify, approve (CONFIRMED), cancel | 근로기준법 §48 |
| PII Access | Decrypt 주민등록번호/계좌번호 | 개인정보보호법 §29 |
| Employee | Create, update, terminate (입퇴사) | 인사 변동 이력 |
| Documents | Download 급여명세서/원천징수영수증 | 문서 접근 기록 |
| Settings | Change salary rules, work policy, insurance config | 설정 변경 이력 |
| Legal Params | Change insurance rates, tax brackets, min wage | SYSTEM_ADMIN 법정 파라미터 (4.8.7) |

## Tenant Isolation (3중 방어 체계 완료)

### 3중 방어 체계

| 레이어 | 상태 | 설명 |
|--------|------|------|
| **1. Application** (Repository findFirst 가드) | ✅ 완료 | 24 Repositories, 68 write 메서드 전부 companyId 검증 (100%) |
| **2. DB RLS** (PostgreSQL Row-Level Security) | ✅ 완료 | 17개 테이블 RLS + FORCE RLS 마이그레이션 |
| **3. Prisma Extension** (자동 companyId 주입) | ⏳ P2 예정 | getPrismaForTenant() 전체 전환은 다음 스프린트 |

### Application-Level Defense (24 Repositories, 68 write 메서드)
All `update()`/`softDelete()`/`delete()` methods use `findFirst({ id, companyId })` before `update()`. Returns `null` if record doesn't belong to the requesting company.

주요 Repositories: `DepartmentRepository`, `PositionRepository`, `SalaryRuleRepository`, `EmployeeSalaryItemRepository`, `AttendanceRepository`, `SalaryCalculationRepository`, `LeaveRequestRepository`, `LeaveBalanceRepository`, `NotificationRepository`, `EmployeeRepository`, `UserRepository`, `WorkPolicyRepository`, `WorkLocationRepository`, `InvitationRepository`, `AnnouncementRepository`, `PaymentRepository` (subscription 경유), `SubscriptionRepository`, `PayrollMonthlyRepository`, `CompanyHolidayRepository` (deleteMany+companyId), `LeaveGroupRepository`, `LeaveTypeConfigRepository`, `LeaveAccrualRuleRepository`.

### DB-Level Defense (PostgreSQL RLS)
17 tenant tables have `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY` + `tenant_isolation_*` policies using `current_setting('app.company_id', true)`.

RLS tables: `users`, `departments`, `positions`, `work_policies`, `work_locations`, `salary_rules`, `employee_salary_items`, `attendances`, `attendance_segments`, `salary_attendance_data`, `salary_calculations`, `leave_requests`, `leave_balances`, `notifications`, `payroll_monthlies`, `audit_logs` (allows NULL companyId for system logs), `company_holidays`.

Global tables (NO RLS): `companies`, `insurance_rates`, `tax_brackets`, `tax_exempt_limits`, `minimum_wages`, `legal_parameters`.

### Prisma Tenant Extension
`getPrismaForTenant(companyId)` in `src/infrastructure/persistence/prisma/client.ts` — auto-injects companyId into all queries on tenant-scoped models (17 TENANT_MODELS). `setTenantContext(prisma, companyId)` sets PostgreSQL session variable for RLS with UUID format validation (SQL injection 방어).

### withTenantAuth Middleware (`src/presentation/middleware/withTenantAuth.ts`)
`withAuth` + RLS 세션 변수 설정을 결합한 인증 래퍼. 사용 시 PostgreSQL `app.company_id` 세션 변수가 자동 설정되어 RLS 정책 동작. DI 컨테이너의 `setTenantContext(companyId)` 경유. 기존 API는 `withAuth` 유지, 신규/수정 API부터 `withTenantAuth` 점진 적용.

### Auth Token Security
- `auth/refresh`: DB user.companyId === JWT payload.companyId 교차 검증 (토큰 조작 시 401)
- `findByIdAndRefreshToken`: id + refreshToken으로 조회 후 호출측에서 companyId 교차 검증

### API Route Fixes
- `departments/[id]`, `positions/[id]`, `settings/work-policy/[id]` — `user.count` WHERE에 `companyId` 추가
- `notifications/[id]/read` — `findFirst` WHERE에 `companyId` 추가
- `auth/me` — user lookup에 `companyId` 추가
- `auth/logout` — `findFirst` guard 추가

### Tests
33 tenant isolation tests in `src/infrastructure/persistence/repositories/__tests__/tenant-isolation.test.ts`.

## E2E Testing (Playwright)

### Configuration (`playwright.config.ts`)
- **Base URL**: `http://localhost:3001`
- **Workers**: 1 (serial execution for stability)
- **3 auth setup files** + **3 test projects** (각각 별도 인증 상태):

| Project | Auth Setup | Storage State | Test Match |
|---------|-----------|---------------|-----------|
| chromium | `auth.setup.ts` (COMPANY_ADMIN) | `.admin-auth-state.json` | 일반 `*.spec.ts` |
| super-admin | `super-admin-auth.setup.ts` (SYSTEM_ADMIN) | `.super-admin-auth-state.json` | `super-admin-*.spec.ts` |
| employee | `employee-auth.setup.ts` (EMPLOYEE) | `.employee-auth-state.json` | `employee-*.spec.ts` |

### Test Accounts
- Admin: `admin@test-company.com` / `admin123!` — COMPANY_ADMIN
- Super Admin: `sysadmin@insa365.com` / `sysadmin123!` — SYSTEM_ADMIN
- Employee: `kim.ys@test-company.com` / `test1234!` — EMPLOYEE

### Running Tests
```bash
# 단위 테스트 (vitest — 399 tests, 21 files, ~1.5s)
npx vitest run

# E2E 전체 실행 (Playwright — 612 tests = UI 563 + 급여 통합 49)
npx playwright test

# 단일 파일
npx playwright test e2e/dashboard.spec.ts

# 급여 통합 E2E (49 tests, 7 Phase 시나리오)
npx playwright test e2e/payroll-integration.spec.ts --project=chromium

# 프로젝트별
npx playwright test --project=super-admin
```

### Vitest Configuration (`vitest.config.ts`)
- **include**: `src/**/*.{test,spec}.{ts,tsx}` — 도메인/인프라 단위 테스트만
- **exclude**: `e2e/**`, `node_modules/**`, `.next/**` — Playwright 파일 분리
- **coverage**: `src/domain/**/*.ts` (v8 provider)
- **path alias**: `@/`, `@domain/`, `@application/`, `@infrastructure/`, `@presentation/`, `@components/`, `@lib/`

### Playwright Selector Guidelines
- **`getByRole('button', { name, exact: true })`** 권장 — accessible name 기반, `<span>` 래핑된 텍스트도 정확히 매칭
- **`:text-is("X")` 주의** — 자식 element(`<span>`, `<div>`)에 텍스트가 있으면 매칭 실패. Tabs 컴포넌트 등에서 문제 발생
- **`:has-text("X")`** — 부분 매칭이라 편리하지만 다중 매칭 주의
- **Strict mode `.first()`** — `text=4,500,000` 같은 금액이 `<td>`와 내부 `<span>`에 동시 매칭 시 `.first()` 필요
- **Hydration mismatch 필터링** — 실시간 시계(Date.now()) 등으로 인한 React hydration 에러는 JS 에러 테스트에서 `err.message.includes('Hydration')` 필터링

### Payroll Integration Test (`e2e/payroll-integration.spec.ts`)
- **Hybrid 접근**: API (`context.request`)로 데이터 셋업 + UI (Playwright)로 급여 플로우 검증
- **테스트 월**: 2026-03 (시드 데이터와 충돌 없는 깨끗한 월)
- **7 Phase**: Cleanup → 근태 생성 → 휴가 → 근태 확정 → 급여 3단계 UI → 결과 검증 → Cleanup
- **Rate Limiting 대응**: API 대량 호출 후 65초 쿨다운 (`page.waitForTimeout(65_000)`)
- **멱등성**: Phase 0-A에서 기존 확정 급여 cancel, attendance manual은 upsert

### GPS Mocking (employee-home)
```typescript
context = await browser.newContext({
  storageState: STORAGE_STATE_PATH,
  geolocation: { latitude: 37.5665, longitude: 126.978 },
  permissions: ['geolocation'],
});
```

## Deployment (배포 설정)

프로덕션 배포 설정 파일은 모두 준비 완료:
- **`Dockerfile`** — 3-stage build (deps → build → standalone runner), `prisma generate` 포함
- **`docker-entrypoint.sh`** — `prisma migrate deploy` 자동 실행 후 `node server.js` 시작
- **`docker-compose.prod.yml`** — app + PostgreSQL 16 + Redis 7 (optional), 헬스체크 `/api/health`
- **`.env.production.example`** — 필수/선택 환경변수 템플릿 (DATABASE_URL, JWT, PII_KEY, Sentry)
- **`next.config.ts`** — `output: 'standalone'`, 보안 헤더 (X-Frame-Options, nosniff), `withSentryConfig`
- **`sentry.server.config.ts`** — DSN + SSN 패턴 마스킹 (`beforeSend`)
- **`sentry.client.config.ts`** — PUBLIC_DSN + Hydration 에러 무시 + 쿠키 PII 제거

```bash
# 프로덕션 배포
cp .env.production.example .env.production  # 실제 값 입력
docker build -t insa365:latest .
docker-compose -f docker-compose.prod.yml up -d
npx tsx scripts/create-sysadmin.ts  # 최초 1회: SYSTEM_ADMIN 생성
```

## Dev Server Setup

```bash
docker-compose up -d          # PostgreSQL (port 5438)
npx prisma migrate dev        # DB migration
npx prisma db seed            # Seed 5 employees (4 monthly + 1 hourly)
npx tsx scripts/create-sysadmin.ts  # sysadmin 계정 (DB에 없을 때)
npm run dev                    # Next.js (port 3001)
```

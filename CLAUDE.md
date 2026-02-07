# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**s1-insa365** is a Korean payroll automation SaaS for SMEs (50-300 employees). It automates 4 social insurances (4대보험), income tax via simplified tax tables (간이세액표), overtime/night/holiday pay premiums, and 52-hour workweek compliance. This is the v2 rewrite (s1) incorporating lessons from s0-insa365.

The product vision: "Korean SME payroll in 3 minutes." Three core modules: Employee Management, Attendance Management, Salary Auto-calculation.

## Technology Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Next.js 15 (App Router) + React Server Components | SWR for client data fetching |
| Backend | Next.js API Routes + **Clean Architecture (필수)** | UseCase 패턴, Domain/Application/Infrastructure 레이어 분리 |
| ORM | Prisma | Type-safe queries, auto-migration |
| Database | PostgreSQL + RLS | Row-Level Security for tenant isolation |
| Batch Processing | BullMQ + Redis | Payroll batch calc, PDF generation queue |
| File Storage | S3-compatible object storage (Cloudflare R2) | presigned URL upload, UUID filenames |
| Monitoring | Sentry | Error tracking + performance monitoring |
| Auth | JWT (Access 1hr + Refresh 7d) + bcrypt | See Auth section |
| Infra | AWS (EC2/ECS + RDS PostgreSQL + ElastiCache Redis) | 다른 프로젝트와 AWS 통합 운영 |

## Clean Architecture (필수)

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
│   ├── queue/        # BullMQ job processors
│   ├── encryption/   # AES-256-GCM service
│   └── external/     # 외부 API 연동
└── presentation/     # Interface Adapters
    ├── api/          # Next.js API Route handlers
    └── middleware/    # Auth, tenant isolation, rate limiting
```

의존성 방향: presentation → application → domain ← infrastructure
domain 레이어는 어떤 외부 라이브러리에도 의존하지 않는다.
급여 계산 핵심 로직(Phase 0~5)은 반드시 domain/application 레이어에 위치.

## Architecture Principles (from PRD/MVP)

These are hard requirements derived from s0 lessons — violating them caused production bugs:

- **All tax/insurance rates in DB, never hardcoded** — s0 broke when rates changed yearly because frontend had hardcoded values. All calculations must call backend APIs that read from `InsuranceRate` and `TaxBracket` tables.
- **Single salary data source** — Employee salary data lives only in `EmployeeSalaryItem`. s0 had dual management (User.baseSalary + EmployeeSalaryItem) causing inconsistencies.
- **Attendance-to-payroll via snapshots** — Confirmed attendance generates a versioned `SalaryAttendanceData` snapshot. Payroll calculates from snapshots, never live attendance data.
- **Multi-tenancy via companyId** — Every DB query must filter by `companyId`. JWT tokens carry `companyId`. Middleware enforces cross-tenant isolation.
- **Soft delete everywhere** — Use `deletedAt` field, never hard delete. Korean labor law requires 3-year data retention.
- **PII encryption** — Resident registration numbers (주민등록번호) use AES-256-GCM encryption.
- **Clean Architecture (필수)** — 모든 백엔드 코드는 domain/application/infrastructure/presentation 4개 레이어로 분리. 의존성 방향: 바깥→안쪽. domain은 외부 의존성 없는 순수 TypeScript. 급여 계산 핵심 로직은 domain/application에만 위치.
- **DB-level tenant isolation (RLS)** — PostgreSQL Row-Level Security policies enforce companyId filtering at DB level. Prisma middleware auto-injects companyId on every query. Defense-in-depth: application code + DB policy both enforce isolation.
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
  (3) [Step 1: 스프레드시트 급여 입력] → Spreadsheet UI with inline editing
      - Salaried: auto-populated, Hourly: attendance-linked + manual override
      - Variable allowances direct input, Employee Skip for leave/unpaid
  (4) [Step 2: Review Summary] → Total pay/deductions/net, MoM comparison, drill-down
  (5) [Step 3: Confirm] → DRAFT → CONFIRMED, 24h cancel window
      → Auto-generates: 급여대장 (payroll ledger) + 급여명세서 (pay stubs)
```

Basic Leave Management (MVP): 6 leave types (연차/반차/병가/경조사/무급휴가/기타), manual remaining days, approval/rejection. Phase 2 adds auto annual leave calculation.

## Global Menu Structure (Sidebar Navigation)

```
Admin (sidebar): 대시보드 (To-do + widgets) → 직원 관리 → 근태 관리 (일별/월별/휴가 관리/52시간) → 급여 관리 (급여 실행/이력/급여대장/명세서)
→ 세무/신고 → 리포트 (4 basic reports in MVP) → 설정 → 시스템 관리 (SYSTEM_ADMIN only)

EMPLOYEE (mobile PWA): 하단 탭바 — 홈(출퇴근+알림) / 근태(근무시간) / 휴가(신청+잔여) / 급여(명세서) / MY(프로필)
```
See PRD 4.9 for admin menu tree, PRD 4.11 for employee mobile experience.

## Payroll Calculation Order

```
Phase 0: Data Loading
  - EmployeeSalaryItem, SalaryAttendanceData
  - InsuranceRate, TaxBracket, TaxExemptLimit
  - Company settings

Phase 1: Ordinary Wage Calculation (통상임금 산정) ★
  - Base salary + allowances where isOrdinaryWage=true
  - Convert bi-monthly/quarterly/annual allowances to monthly
  - ordinaryHourlyWage = monthlyOrdinaryWage / 209
  - Minimum wage check (warning if below)

Phase 2: Gross Pay (총 지급액)
  - Base salary (pro-rated for mid-month join/leave)
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

- COMPANY_ADMIN: full company data access
- MANAGER: department-scoped read access
- EMPLOYEE: own data only

Sensitive data permission:
- `canViewSensitive` flag per user — controls access to 주민등록번호, 계좌번호
- Default: only COMPANY_ADMIN has canViewSensitive=true
- Every PII field access (decrypt) is logged to AuditLog (개인정보보호법 §29)

## Auth

JWT-based: Access Token (1hr) + Refresh Token (7d). Passwords: bcrypt with 10 salt rounds.

**API Client Auth Guard** (`src/lib/api.ts`):
- `handleResponse()` intercepts 401 → attempts `/api/auth/refresh` → on failure redirects to `/login`
- **Auth page exception**: `/login`, `/signup` 페이지에서는 401 시 refresh/redirect를 스킵하여 무한 새로고침 방지
- `useAuth()` hook (`src/hooks/useAuth.ts`): SWR로 `/api/auth/me` fetch. `revalidateOnFocus: false`, `errorRetryCount: 0`으로 설정하여 미인증 상태에서 불필요한 재시도 방지

## Seed Data on Company Signup

Auto-created: 5 departments, 5 positions, 1 work policy (09:00-18:00, 60min break), 1 work location, 11 allowance rules (A01-A11), 12 deduction rules (D01-D12), 2 minimum wages (2025-2026), 10 legal parameters (work hours, overtime rates, etc.).

## Non-Functional Targets

- API P95 < 500ms, batch payroll for 300 employees < 10s
- Test coverage: 80%+ overall, 95%+ for payroll calculation logic
- Security: AES-256-GCM for PII, HTTPS only, rate limiting (login: 5/min, API: 100/min)

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

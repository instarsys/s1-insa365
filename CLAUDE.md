# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**s1-insa365** is a Korean payroll automation SaaS for SMEs (50-300 employees). It automates 4 social insurances (4대보험), income tax via simplified tax tables (간이세액표), overtime/night/holiday pay premiums, and 52-hour workweek compliance. This is the v2 rewrite (s1) incorporating lessons from s0-insa365.

The product vision: "Korean SME payroll in 3 minutes." Three core modules: Employee Management, Attendance Management, Salary Auto-calculation.

## Architecture Principles (from PRD/MVP)

These are hard requirements derived from s0 lessons — violating them caused production bugs:

- **All tax/insurance rates in DB, never hardcoded** — s0 broke when rates changed yearly because frontend had hardcoded values. All calculations must call backend APIs that read from `InsuranceRate` and `TaxBracket` tables.
- **Single salary data source** — Employee salary data lives only in `EmployeeSalaryItem`. s0 had dual management (User.baseSalary + EmployeeSalaryItem) causing inconsistencies.
- **Attendance-to-payroll via snapshots** — Confirmed attendance generates a versioned `SalaryAttendanceData` snapshot. Payroll calculates from snapshots, never live attendance data.
- **Multi-tenancy via companyId** — Every DB query must filter by `companyId`. JWT tokens carry `companyId`. Middleware enforces cross-tenant isolation.
- **Soft delete everywhere** — Use `deletedAt` field, never hard delete. Korean labor law requires 3-year data retention.
- **PII encryption** — Resident registration numbers (주민등록번호) use AES-256-GCM encryption.

## Data Model (Key Entities)

```
Company ──1:N── Department, WorkPolicy, WorkLocation, SalaryRule
Company ──1:N── User (Employee)
User ──1:N── Attendance, EmployeeSalaryItem, SalaryCalculation
Attendance ──1:N── AttendanceSegment

Standalone reference tables: InsuranceRate (date-range based), TaxBracket (yearly), TaxExemptLimit (yearly), PayrollMonthly (monthly history)
```

Key relationships:
- `SalaryRule` (company-level template) → copied to `EmployeeSalaryItem` (per-employee) on hire
- Employee number format: `E{A-Z}{0000-9999}` (e.g., EA1234)
- Salary workflow: `DRAFT → CONFIRMED → PAID` (also `FAILED` for calculation errors)

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

## Auth

JWT-based: Access Token (1hr) + Refresh Token (7d). Passwords: bcrypt with 10 salt rounds.

## Seed Data on Company Signup

Auto-created: 5 departments, 5 positions, 1 work policy (09:00-18:00, 60min break), 1 work location, 11 allowance rules (A01-A11), 12 deduction rules (D01-D12).

## Non-Functional Targets

- API P95 < 500ms, batch payroll for 300 employees < 10s
- Test coverage: 80%+ overall, 95%+ for payroll calculation logic
- Security: AES-256-GCM for PII, HTTPS only, rate limiting (login: 5/min, API: 100/min)

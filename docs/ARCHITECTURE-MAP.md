# s1-insa365 아키텍처 맵

> 최종 기준선 업데이트: 2026-04-18
> 목적: 코드베이스 전체 구조, 핵심 계약, 현재 작업 중인 경계면을 빠르게 재구성하기 위한 운영용 지도

## 1. 코드베이스 스냅샷

- 스택: `Next.js 16` + `React 19` + `TypeScript 5` + `Prisma 7` + `PostgreSQL`
- 런타임 보조: `SWR`, `Vitest`, `Playwright`, `Sentry`, `Resend`, `S3-compatible storage`
- 현재 계수 기준:
  - 페이지 `57`
  - 레이아웃 `6`
  - API Route `138`
  - UseCase `65`
  - Repository `34`
  - Prisma 모델 `37`
- 검증 기준선:
  - `npm run type-check` 통과
  - `npm run test`는 현재 워킹트리 기준 실패
  - 단위 테스트 실패 2건:
    - `src/application/use-cases/attendance/__tests__/CheckInAttendanceUseCase.test.ts`
    - 원인: `CheckInAttendanceUseCase`의 `checkInAllowedMinutes` 검증이 추가되었지만 테스트 픽스처가 현재 시각 의존 상태로 남아 있음

## 2. 제품 중심 흐름

이 서비스의 중심 플로우는 아래 순서로 이해하면 된다.

1. 직원 관리
   - 회사 가입 후 조직, 직급, 근무정책, 근무지, 급여규칙, 급여그룹이 시드된다.
   - 직원 생성 시 급여 항목, 권한, 근무 관련 기본값이 연결된다.
2. 근태 관리
   - 직원은 모바일 PWA에서 출퇴근과 휴가를 처리한다.
   - 관리자는 근태 목록/달력/52시간 화면에서 기록을 확인하고 확정한다.
3. 급여 계산과 확정
   - 근태 확정은 `SalaryAttendanceData` 스냅샷을 생성한다.
   - 급여는 스냅샷 기준으로 계산되고 `DRAFT -> CONFIRMED -> PAID` 흐름을 따른다.
   - `CONFIRMED`는 실질적으로 불가역 상태다.
4. 세무와 리포트
   - 급여 스냅샷을 바탕으로 원천징수, 간이지급명세서, 원천징수영수증, 리포트가 파생된다.

## 3. 레이어 구조

### Domain: 순수 계산과 규칙

- 경로: `src/domain`
- 핵심 역할:
  - 급여 계산 규칙
  - 근태 판정 규칙
  - 휴가 발생 규칙
  - 값 객체 기반 유효성 제약
- 핵심 서비스:
  - `AttendanceClassifier`
  - `GrossPayCalculator`
  - `DeductionCalculator`
  - `InsuranceCalculator`
  - `TaxCalculator`
  - `PayrollCalculator`
- 핵심 엔티티/VO:
  - `Employee`, `AttendanceRecord`, `SalaryItem`
  - `Money`, `EmployeeNumber`, `BusinessNumber`, `Permission`

### Application: 유스케이스와 포트

- 경로: `src/application`
- 핵심 역할:
  - 사용자 요청을 비즈니스 흐름으로 조립
  - Repository Port와 DTO로 계층 경계를 유지
  - 에러 메시지와 응답 shape를 사용자 관점으로 정리
- 주요 하위 도메인:
  - `auth`
  - `attendance`
  - `employees`
  - `leave`
  - `payroll`
  - `settings`
  - `system`
  - `tax`
  - `upload`

### Infrastructure: 저장소와 외부 연동

- 경로: `src/infrastructure`
- 핵심 역할:
  - Prisma Repository 구현
  - DI 컨테이너 조립
  - 인증, 암호화, 이메일, 파일 업로드, 외부 API 연동
- 핵심 진입점:
  - `src/infrastructure/di/container.ts`
  - `src/infrastructure/persistence/repositories/*`
  - `src/infrastructure/persistence/prisma/*`

### Presentation / Next App

- 경로: `src/app`, `src/presentation`
- 핵심 역할:
  - App Router 페이지와 API Route
  - 인증 래퍼, 응답 헬퍼, 미들웨어
  - SWR 훅과 프론트 상태 연결
- 라우트 그룹:
  - `src/app/(admin)` 관리자 웹
  - `src/app/(employee)` 직원 모바일 PWA
  - `src/app/super-admin` 시스템 관리자 콘솔
  - `src/app/(auth)` 인증 화면
  - `src/app/(public)` 공개 랜딩/정책 페이지
  - `src/app/api` API 엔드포인트

## 4. 실제 진입점 맵

### 관리자 웹

- 루트 그룹: `src/app/(admin)`
- 주요 메뉴:
  - `dashboard`
  - `employees`
  - `attendance`
  - `payroll`
  - `reports`
  - `settings`
  - `tax`

### 직원 PWA

- 루트 그룹: `src/app/(employee)`
- 주요 경로:
  - `home`
  - `leave`
  - `salary`
  - `my`
  - `e` 하위 직원용 화면

### 시스템 관리자

- 루트 그룹: `src/app/super-admin`
- 주요 경로:
  - `dashboard`
  - `legal-params`
  - `audit-log`
  - `tenants`
  - `users`
  - `plans`

### API 계층

- 루트 그룹: `src/app/api`
- 주요 도메인:
  - `auth`
  - `employees`
  - `attendance`
  - `leave`
  - `payroll`
  - `settings`
  - `reports`
  - `tax`
  - `billing`
  - `super-admin`
  - `upload`

## 5. 절대 계약

아래 규칙은 리뷰 시 항상 먼저 확인해야 하는 계약이다.

### API Route 규율

- API Route는 `prisma`를 직접 import하지 않는다.
- API Route는 `getContainer()`를 통해 Repository, Service, UseCase에 접근한다.
- 프론트엔드가 기대하는 필드명이 Repository 응답과 다르면 API에서 평탄화한다.
- UseCase와 API가 반환하는 검증 에러 메시지는 한국어를 유지한다.

### 멀티테넌시

- 모든 회사 데이터는 `companyId`를 경계로 삼는다.
- Repository write 메서드는 대상 레코드 소속 회사를 먼저 검증한다.
- PostgreSQL RLS가 이중 방어를 담당한다.
- 인증 토큰도 `companyId`를 포함하고 refresh 시 교차 검증한다.

### 급여/근태 데이터 정합성

- 급여 계산은 실시간 근태가 아니라 확정 스냅샷을 기준으로 한다.
- 법정 요율은 코드 하드코딩이 아니라 DB 값을 기준으로 한다.
- 확정 급여는 취소 가능한 임시 상태가 아니라 최종 스냅샷으로 취급한다.

### 인증/라우팅

- `src/proxy.ts`는 공개 경로, 역할별 기본 경로, API rate limit을 담당한다.
- `src/lib/api.ts`는 `401 -> refresh -> retry`를 담당한다.
- `src/hooks/useAuth.ts`는 auth page 예외와 SWR 캐시 주입의 기준점이다.

## 6. 공용 인터페이스와 검토 우선순위

안정적으로 관리해야 하는 외부 계약은 아래 네 축이다.

1. API Route 응답 shape
   - 경로: `src/app/api/**/route.ts`
2. SWR 훅 계약
   - 경로: `src/hooks/**`
3. Prisma 스키마
   - 경로: `prisma/schema.prisma`
4. DI 컨테이너 공개 항목
   - 경로: `src/infrastructure/di/container.ts`

리뷰 시 우선 확인할 항목:

1. 응답 필드명이 프론트 기대값과 정확히 맞는가
2. `companyId` 검증이 빠진 읽기/쓰기 경로가 없는가
3. 새 UseCase 에러 메시지가 한국어인가
4. Hook과 DTO 이름이 API 응답과 일치하는가

## 7. 현재 WIP 경계: 세무 기능

현재 워킹트리에서 가장 뚜렷한 확장 영역은 세무 기능이다.

### 새로 추가되거나 변경 중인 경로

- UI
  - `src/app/(admin)/tax/withholding/page.tsx`
  - `src/app/(admin)/tax/reports/page.tsx`
  - `src/app/(admin)/tax/withholding-receipt/page.tsx`
- API
  - `src/app/api/tax/withholding/route.ts`
  - `src/app/api/tax/withholding/employees/route.ts`
  - `src/app/api/tax/reports/withholding-return/route.ts`
  - `src/app/api/tax/reports/simplified-statement/route.ts`
  - `src/app/api/tax/withholding-receipt/route.ts`
  - `src/app/api/tax/annual-summary/route.ts`
- Application
  - `src/application/dtos/tax.ts`
  - `src/application/use-cases/tax/*`
- Frontend hook
  - `src/hooks/useTax.ts`
- Supporting schema and container
  - `prisma/schema.prisma`
  - `src/infrastructure/di/container.ts`

### 현재 세무 계약 요약

- 월별 원천징수 집계: `WithholdingMonthlySummaryDto`
- 직원별 상세: `WithholdingEmployeeDetailDto`
- 원천징수이행상황신고서: `WithholdingReturnDto`
- 간이지급명세서: `SimplifiedStatementDto`
- 원천징수영수증: `WithholdingReceiptDto`
- 연간 누적 및 월별 납부서: `AnnualTaxSummaryDto`, `MonthlyTaxPaymentDto`

### 세무 WIP 검토 포인트

- 회사 정보 확장 필드가 스키마, 회사 설정 API, 세무 보고서 DTO에서 일관되는가
- `userId`, `year`, `month`, `half` 같은 쿼리 파라미터 검증이 누락되지 않았는가
- 보고서 API가 프론트 훅이 기대하는 shape 그대로 반환하는가
- 직원별 영수증/상세 조회가 다른 회사 사용자에게 새지 않는가

## 8. 테스트와 검증 기준선

### 기본 실행

```bash
npm run type-check
npm run test
```

### 필요 시 추가 검증

```bash
npx playwright test
npx playwright test e2e/payroll-integration.spec.ts --project=chromium
npx playwright test e2e/settings-company.spec.ts
```

### 회귀 위험이 큰 구간

- 급여 계산
- 근태 확정과 취소
- 역할 기반 라우팅과 인증 refresh
- Repository 수준 테넌트 격리
- 세무 집계 화면과 API 응답 shape

### 현재 확인된 테스트 불일치

- `CheckInAttendanceUseCase`는 `09:00` 기준 `30분 전`부터만 출근을 허용한다.
- 기존 테스트는 시간을 고정하지 않고 `useCase.execute()`를 바로 호출한다.
- 따라서 새벽/이른 시간 실행 시 `ValidationError`가 발생해 테스트 2건이 실패한다.
- 이 이슈는 세무 WIP와 직접 관련은 없지만, 현재 저장소 기준선 문서에서는 "테스트 모두 통과"로 간주하면 안 된다.

## 9. 협업 기본값

- 기본 역할 분담:
  - Claude Code: 주 구현
  - Codex: 구조 파악, 리뷰, 검증, 회귀 확인
- 기본 작업 순서:
  1. 계약 확인
  2. 레이어 위반 탐지
  3. 타입/테스트 검증
  4. 회귀 포인트 리뷰

세부 운영 절차는 `docs/VERIFICATION-PLAYBOOK.md`를 기준으로 한다.

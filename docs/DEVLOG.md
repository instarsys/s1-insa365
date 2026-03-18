# 개발 변경 기록 (Dev Changelog)

> 되돌리기 어려운 변경(DB 마이그레이션, 인터페이스 변경 등)의 설계 의도와 교훈을 기록합니다.
> `git log`보다 상위 수준의 맥락 보존이 목적입니다.

### 엔트리 포맷

```
## [YYYY-MM-DD] 제목

### 배경 (왜)
### 변경 내용 (무엇을)
### 수정 파일 (영향 범위)
### DB 마이그레이션 (해당 시)
### 설계 결정
### 검증
### 교훈 / 주의사항
```

---

## [2026-03-19] 근태 확정 취소 + 급여 연쇄 취소 + 확정 근태 보호

### 배경 (왜)

근태 "확정 취소" 버튼 클릭 시 "급여가 확정된 상태입니다. 급여 확정을 먼저 취소해주세요." 에러가 표시되어 취소가 불가능한 문제. `attendance/cancel` API가 급여 CONFIRMED/PAID 상태를 올바르게 차단하고 있으나, **급여 취소 UI가 없어서** 사용자가 막히는 상황. 또한 확정된 근태 기록에 대한 수정/삭제 보호가 없었음.

### 변경 내용 (무엇을)

**1. 신규 API: `POST /api/attendance/cancel`**
- 급여 CONFIRMED/PAID 상태 확인 → 차단
- 근태 확정 해제 (`isConfirmed: false`)
- 자동 생성된 결근 레코드 삭제 (ABSENT + checkInTime=null)
- SalaryAttendanceData 스냅샷 삭제
- 감사 로그 기록
- `withRole('MANAGER')` 이상 접근 가능

**2. AttendanceConfirmBar UI 개선 (calendar/page.tsx)**
- `usePayrollSummary(year, month)` SWR로 급여 상태 확인
- CONFIRMED 상태: confirm 다이얼로그 → 급여 취소 → 근태 취소 순차 실행 (연쇄 취소)
- PAID 상태: 취소 버튼 disabled + 토스트 안내
- 미확정 상태: 기존 동작 유지 (근태만 취소)
- 급여 확정됨/지급완료 뱃지 표시 (파란색/초록색 pill)

**3. 확정 근태 보호 (3개 API)**
- `attendance/[id]` DELETE: 확정된 근태 삭제 차단
- `attendance/manual` POST: 확정된 근태 수정 차단
- `AttendanceRecordModal`: 확정 근태 읽기 전용 모드 (입력 필드 disabled + 안내 배너)

**4. Repository 메서드 추가**
- `AttendanceRepository.unconfirmByDateRange()` — 기간 내 근태 확정 해제
- `AttendanceRepository.deleteAutoAbsentByDateRange()` — 자동 결근 삭제
- `SalaryAttendanceDataRepository.deleteByPeriod()` — 스냅샷 삭제

**5. attendance/confirm API 개선**
- 타임존 안전 날짜 처리: `toISOString().split('T')[0]` → 로컬 `toDateStr()` 함수
- UTC 날짜 범위: `new Date(year, month-1, 1)` → `new Date(Date.UTC(year, month-1, 1))`
- 근태면제 직원: all-zero 스냅샷 생성 (결근 미생성)
- 에러 로깅: `catch {}` → `catch (error) { console.error(...) }`

**6. AttendanceRepository 날짜 범위 일관성**
- 5개 메서드(findMonthly, confirmByPeriod, findAllByMonth, findForCalendar×2)의 날짜 범위를 UTC 기반으로 통일

**7. usePayroll 훅 개선**
- `PayrollSummary` 인터페이스에 `status: string | null` 추가
- `usePayrollSummary`, `usePayrollAttendanceReview`에서 `mutate` 반환 추가

### 수정 파일 (영향 범위)

| 레이어 | 파일 | 변경 |
|--------|------|------|
| API | `src/app/api/attendance/cancel/route.ts` | **신규** — 근태 확정 취소 |
| API | `src/app/api/attendance/[id]/route.ts` | 확정 근태 삭제 차단 |
| API | `src/app/api/attendance/manual/route.ts` | 확정 근태 수정 차단 |
| API | `src/app/api/attendance/confirm/route.ts` | 타임존 수정 + 근태면제 + 에러 로깅 |
| Repository | `src/infrastructure/persistence/repositories/AttendanceRepository.ts` | 2 메서드 추가 + 5 메서드 UTC 수정 |
| Repository | `src/infrastructure/persistence/repositories/SalaryAttendanceDataRepository.ts` | deleteByPeriod 추가 |
| UI | `src/app/(admin)/attendance/calendar/page.tsx` | AttendanceConfirmBar 연쇄 취소 + 뱃지 |
| Component | `src/components/attendance/AttendanceRecordModal.tsx` | 읽기 전용 모드 |
| Hook | `src/hooks/useAttendance.ts` | cancelConfirmAttendance 추가 |
| Hook | `src/hooks/usePayroll.ts` | status 필드 + mutate 반환 |
| E2E | `e2e/attendance-confirm.spec.ts` | **신규** — 확정/취소 E2E 테스트 |

### 설계 결정

**연쇄 취소 (프론트) vs 백엔드 일괄 취소 API** → **프론트 연쇄 취소** 선택

| 대안 | 장점 | 단점 |
|------|------|------|
| 백엔드 일괄 API | 원자적 트랜잭션 | 급여 취소의 24h 제한 등 기존 비즈니스 규칙 우회 위험 |
| **프론트 연쇄 취소** ✅ | 기존 API 재사용, 각 API 비즈니스 규칙 유지 | 중간 실패 시 부분 취소 가능 |

**선택 이유**: 급여 취소(`/api/payroll/cancel`)는 24시간 윈도우, COMPANY_ADMIN 전용 등 고유한 비즈니스 규칙이 있음. 이를 우회하는 백엔드 일괄 API를 만들면 규칙 중복 관리 필요. 프론트에서 순차 호출하면 각 API의 규칙이 그대로 적용됨.

### 검증

- `tsc --noEmit`: ✓ 타입 에러 없음
- `e2e/attendance-confirm.spec.ts`: ✓ 확정/취소 플로우 검증

### 교훈 / 주의사항

1. **확정된 데이터 보호는 API 레벨에서**: UI에서만 막으면 API 직접 호출로 우회 가능. 확정된 근태의 수정/삭제는 반드시 API에서 차단.
2. **타임존 일관성**: `new Date(year, month-1, 1).toISOString().split('T')[0]`은 UTC+9에서 전날로 변환됨. DB 쿼리 범위는 `Date.UTC()`로, 날짜 문자열은 로컬 `toDateStr()`로 일관되게 처리.
3. **연쇄 작업 시 에러 핸들링**: 급여 취소 → 근태 취소 순서에서 급여 취소 실패 시 근태 취소를 실행하지 않아야 함. catch에서 `mutatePayroll()`로 SWR 캐시 복구.

---

## [2026-03-18] 근태면제(attendanceExempt) 기능 + 시급제 동시 설정 방어

### 배경 (왜)

임원/대표 등 출퇴근 기록이 불필요한 직원을 위한 **근태면제** 기능이 필요. 근태면제 직원은 근태 확정 없이도 급여 계산이 가능해야 하며, 출퇴근 버튼이 노출되지 않아야 함.

구현 후 발견된 버그: 직원 상세 페이지에서 기본정보 탭에서 `attendanceExempt=true` 저장 → 급여 탭에서 시급제로 변경 → 급여 탭 payload에 `attendanceExempt`가 없어 서버 검증 통과 → DB에 `HOURLY + attendanceExempt=true` 불법 조합 저장.

### 변경 내용 (무엇을)

**1. DB 스키마**
- User 모델에 `attendanceExempt Boolean @default(false)` 컬럼 추가

**2. API 서버**
- 직원 생성/수정 Zod 스키마: `attendanceExempt` 필드 + `refine()` (HOURLY+면제 동시 금지)
- 직원 수정 PUT (`employees/[id]/route.ts`): DB 기존값 포함 effective 검증 → 시급제+근태면제 시 에러 대신 `attendanceExempt=false` **자동 해제**
- 직원 생성 POST: `attendanceExempt` 필드 저장
- CheckIn/CheckOutUseCase: 근태면제 직원 출퇴근 시 에러 throw
- CalculatePayrollUseCase: 근태면제 직원은 `attendanceMap`에 없어도 SKIPPED 대신 기본급+고정수당 계산 진행
- 근태 달력 API: `attendanceExempt` 필드 응답에 포함

**3. 프론트엔드**
- 직원 상세 기본정보: 근태면제 토글 (시급제 시 disabled + 경고 메시지)
- 직원 상세 급여 탭: 시급제 save 시 `attendanceExempt: false` payload에 포함
- 직원 등록 폼: 근태면제 토글 + 시급제 변경 시 자동 OFF
- 직원앱 홈: 근태면제 시 출퇴근 버튼 대신 면제 안내 카드
- 직원앱 근태: 근태면제 시 빈 안내 메시지
- 근태 달력: 면제 직원 이름 옆에 "면제" 뱃지
- useAuth/useEmployees/useAttendance 훅: `attendanceExempt` 타입 추가
- **안내 문구 UI 개선**: plain `text-xs text-gray-400` → styled info box (`rounded-lg border bg-gray-50 p-3` + `Info` 아이콘). 시급제 경고도 amber info box (`AlertTriangle` 아이콘). 읽기 전용 모드에서 조건 제거 → 항상 표시

**4. UserRepository**
- `update()`: `UserUpdateInput` → `UserUncheckedUpdateInput` (attendanceExempt 직접 업데이트 허용)
- `findAllForCalendar()`, `findCurrentUser()`: attendanceExempt select 추가

### 수정 파일 (영향 범위)

| 레이어 | 파일 | 변경 |
|--------|------|------|
| Schema | `prisma/schema.prisma` | User에 attendanceExempt 추가 |
| Migration | `prisma/migrations/20260317164902_add_attendance_exempt/` | 신규 |
| DTO | `src/application/dtos/employee.ts` | Create/Update/EmployeeDto에 attendanceExempt 추가 |
| Schema | `src/presentation/api/schemas/employee.ts` | create/update 스키마 + refine 추가 |
| API | `src/app/api/employees/route.ts` | POST에 attendanceExempt 저장 |
| API | `src/app/api/employees/[id]/route.ts` | PUT effective 검증 + 자동 해제 |
| API | `src/app/api/attendance/calendar/route.ts` | attendanceExempt 응답 포함 |
| UseCase | `src/application/use-cases/attendance/CheckInAttendanceUseCase.ts` | 면제 직원 차단 |
| UseCase | `src/application/use-cases/attendance/CheckOutAttendanceUseCase.ts` | 면제 직원 차단 |
| UseCase | `src/application/use-cases/payroll/CalculatePayrollUseCase.ts` | 면제 직원 all-zero 근태로 계산 |
| Repository | `src/infrastructure/persistence/repositories/UserRepository.ts` | UncheckedUpdateInput + select 추가 |
| UI | `src/app/(admin)/employees/[id]/page.tsx` | 근태면제 토글 + 급여 탭 동기화 |
| UI | `src/app/(admin)/employees/list/page.tsx` | 등록 폼 근태면제 토글 |
| UI | `src/app/(employee)/home/page.tsx` | 면제 안내 카드 |
| UI | `src/app/(employee)/e/attendance/page.tsx` | 면제 안내 메시지 |
| Component | `src/components/attendance/AttendanceCalendarGrid.tsx` | 면제 뱃지 |
| Hook | `src/hooks/useAuth.ts` | attendanceExempt 타입 |
| Hook | `src/hooks/useEmployees.ts` | attendanceExempt 타입 |
| Hook | `src/hooks/useAttendance.ts` | attendanceExempt 타입 |

### DB 마이그레이션

**마이그레이션명**: `20260317164902_add_attendance_exempt`

단일 컬럼 추가: `ALTER TABLE "users" ADD COLUMN "attendance_exempt" BOOLEAN NOT NULL DEFAULT false;`

**데이터 이동**: 없음. 기존 직원 전부 `false` (비면제).
**롤백**: `ALTER TABLE "users" DROP COLUMN "attendance_exempt";`

### 설계 결정

**시급제+근태면제 충돌 시 에러 vs 자동 해제** → **자동 해제** 선택

| 대안 | 장점 | 단점 |
|------|------|------|
| 에러 반환 | 명시적 | 별도 탭 save에서 에러 발생 시 사용자 혼란 |
| **자동 해제** ✅ | UX 자연스러움, 데이터 정합성 보장 | 암묵적 변경 (하지만 UI에서 즉시 반영) |

**선택 이유**: 직원 상세 페이지에서 기본정보 탭과 급여 탭이 별도 save인 상황에서, 급여 탭에서 시급제 저장 시 에러가 나면 "근태면제를 먼저 해제하세요"라는 메시지는 UX상 부자연스러움. 서버가 자동 해제하고, 프론트엔드에서도 payload에 `attendanceExempt: false`를 포함하여 이중 방어.

### 검증

- `tsc --noEmit`: ✓ 타입 에러 없음
- `npx vitest run`: ✓ 18파일 373테스트 전부 통과

### 교훈 / 주의사항

1. **별도 탭/섹션 save 시 상호 의존 필드 주의**: 한 엔티티를 여러 UI 섹션에서 부분 업데이트할 때, payload에 없는 필드는 `undefined`로 전달됨. 서버는 반드시 DB 기존값을 포함한 effective 값으로 비즈니스 규칙을 검증해야 함.
2. **`validation.data.field === true` vs `validation.data.field`**: `=== true` 비교는 `undefined`를 걸러내지만, 다른 탭에서 이미 DB에 `true`를 저장한 경우를 놓침. effective 값(payload ?? DB) 패턴 사용.
3. **UserUpdateInput vs UserUncheckedUpdateInput**: Prisma에서 Boolean 필드를 직접 업데이트하려면 `UncheckedUpdateInput` 사용 필요 (`UpdateInput`은 relation 필수).

---

## [2026-03-18] 테넌트 격리(companyId) 3중 방어 체계 완성

### 배경 (왜)

MVP 출시 전 전체 감사에서 24개 Repository, 68개 write 메서드 중 5건의 CRITICAL companyId 미검증 취약점과 4건의 구조적 개선 필요 사항을 발견. 타 테넌트 데이터에 대한 무단 수정/삭제가 이론상 가능한 상태였음.

**발견된 P0 취약점**:
1. `SalaryCalculationRepository.update()` — companyId 없이 ID만으로 급여 데이터 수정 가능
2. `PaymentRepository` — companyId 없이 결제 상태 변경 가능
3. `InvitationRepository.update()` — companyId 없이 초대 수정 가능
4. `AnnouncementRepository.softDelete()` — 누구든 어떤 공지든 삭제 가능
5. `auth/refresh` — JWT companyId와 DB companyId 교차 검증 없음

### 변경 내용 (무엇을)

**1. P0 CRITICAL 5건 — Application-level companyId 가드 추가**
- SalaryCalculationRepository: `update(id, data)` → `update(companyId, id, data)` + findFirst 가드
- PaymentRepository: `updateStatus(id, status)` → `updateStatus(companyId, id, status)` + subscription 경유 companyId 검증
- InvitationRepository: `update(id, data)` → `update(companyId, id, data)` + findFirst 가드
- AnnouncementRepository: `softDelete(id)` → `softDelete(companyId, id)` + findFirst 가드 (companyId=null 시스템 공지 지원)
- auth/refresh: DB user.companyId === JWT payload.companyId 교차 검증 추가

**2. 잔여 1건 — CompanyHolidayRepository.delete()**
- `prisma.companyHoliday.delete({ where: { id } })` → `prisma.companyHoliday.deleteMany({ where: { id, companyId } })` — 이중 안전

**3. P1 구조적 개선 4건**
- company_holidays 테이블에 RLS 정책 추가 (16 → 17개 테이블)
- 17개 테이블에 `FORCE ROW LEVEL SECURITY` 적용 (table owner도 RLS 적용)
- `withTenantAuth` 미들웨어 신규: `withAuth` + RLS 세션 변수(`app.company_id`) 자동 설정
- `setTenantContext` UUID 형식 검증 추가 (SQL injection 방어)

**4. 인프라 변경**
- DI 컨테이너: `setTenantContext(companyId)` 함수 export 추가
- tenant-extension: TENANT_MODELS에 `CompanyHoliday` 추가 (17개)

**5. 테스트**
- 테넌트 격리 단위 테스트: 19개 → 33개 (+14)
- vitest 전체: 341개 → 373개 (+32)

### 수정 파일 (영향 범위)

| 레이어 | 파일 | 변경 |
|--------|------|------|
| Port | `src/application/ports/ISalaryCalculationRepository.ts` | update 시그니처 변경 |
| Repository | `src/infrastructure/persistence/repositories/SalaryCalculationRepository.ts` | companyId 가드 |
| Repository | `src/infrastructure/persistence/repositories/PaymentRepository.ts` | companyId 가드 (subscription 경유) |
| Repository | `src/infrastructure/persistence/repositories/InvitationRepository.ts` | companyId 가드 |
| Repository | `src/infrastructure/persistence/repositories/AnnouncementRepository.ts` | companyId 가드 |
| Repository | `src/infrastructure/persistence/repositories/CompanyHolidayRepository.ts` | deleteMany+companyId |
| UseCase | `src/application/use-cases/payroll/UpdatePayrollItemUseCase.ts` | companyId 전달 |
| UseCase | `src/application/use-cases/payroll/SkipEmployeePayrollUseCase.ts` | companyId 전달 |
| API | `src/app/api/payroll/[id]/route.ts` | auth.companyId 전달 |
| API | `src/app/api/payroll/[id]/skip/route.ts` | auth.companyId 전달 |
| API | `src/app/api/billing/payments/route.ts` | auth.companyId 전달 |
| API | `src/app/api/invitations/[id]/resend/route.ts` | auth.companyId 전달 |
| API | `src/app/api/auth/refresh/route.ts` | JWT↔DB companyId 교차 검증 |
| API | `src/app/api/auth/join/route.ts` | companyId 전달 |
| Middleware | `src/presentation/middleware/withTenantAuth.ts` | **신규** — withAuth + RLS |
| Extension | `src/infrastructure/persistence/prisma/tenant-extension.ts` | CompanyHoliday + UUID 검증 |
| DI | `src/infrastructure/di/container.ts` | setTenantContext export |
| Migration | `prisma/migrations/20260318100000_tenant_isolation_hardening/` | **신규** — RLS + FORCE RLS |
| Test | `src/infrastructure/persistence/repositories/__tests__/tenant-isolation.test.ts` | 19 → 33 테스트 |
| Hook | `src/hooks/usePayroll.ts` | skipEmployee API 경로 수정 |
| DTO | `src/application/dtos/payroll.ts` | UpdatePayrollItemDto skipReason 추가 |

### DB 마이그레이션

**마이그레이션명**: `20260318100000_tenant_isolation_hardening`

**2단계**:
1. `company_holidays` 테이블에 `ENABLE ROW LEVEL SECURITY` + RLS 정책 생성
2. 17개 테넌트 테이블에 `FORCE ROW LEVEL SECURITY` 적용

**데이터 이동**: 없음. 정책 변경만.
**롤백 주의**: FORCE RLS 제거 시 `ALTER TABLE ... NO FORCE ROW LEVEL SECURITY` 필요.

### 설계 결정

**withTenantAuth 점진 적용 vs 일괄 전환** → **점진 적용** 선택

| 대안 | 장점 | 단점 |
|------|------|------|
| **점진 적용** ✅ | 안전, 기존 API 동작 보장 | 두 가지 패턴 공존 |
| 일괄 전환 | 일관성 | 110+ API 일괄 수정 위험, 회귀 가능 |

**선택 이유**: Application-level 가드가 이미 100% 완비되어 있으므로, RLS는 defense-in-depth. 신규 API부터 적용하면서 점진적으로 전환하는 것이 안전.

### 검증

- `tsc --noEmit`: ✓ 타입 에러 없음
- `npx vitest run`: ✓ 18파일 373테스트 전부 통과 (1.37s)
- 테넌트 격리 테스트 33개: 모든 cross-tenant 접근 차단 확인

### 교훈 / 주의사항

1. **Repository 감사는 주기적으로**: 새 Repository/메서드 추가 시 companyId 가드를 빠뜨리기 쉬움. 체크리스트에 "companyId 가드 확인" 추가.
2. **delete vs deleteMany**: `delete({ where: { id } })`는 companyId를 포함할 수 없음. 테넌트 격리가 필요한 삭제는 반드시 `deleteMany({ where: { id, companyId } })` 사용.
3. **FORCE RLS 필수**: PostgreSQL에서 table owner는 기본적으로 RLS를 우회함. `FORCE ROW LEVEL SECURITY`를 적용해야 owner에게도 RLS 적용.
4. **JWT companyId 교차 검증**: Refresh token 재발급 시 JWT payload의 companyId와 DB user의 companyId를 반드시 교차 검증. 토큰 조작에 의한 테넌트 전환 공격 방어.

---

## [2026-03-16] Go/No-Go 코드 감사 + 테스트 보강 + vitest 설정 수정

### 배경 (왜)

MVP 출시 전 Go/No-Go 검증 7개 항목에 대한 코드 감사 수행. 급여 계산 정확도, 4대보험/소득세 공식, 52시간 초과 감지, PII 보안, 배포 설정의 구현 완전성을 체계적으로 검증하여 출시 가부를 판단하기 위함.

### 변경 내용 (무엇을)

**1. 입사유형 CONTRACT 추가**
- `HIRE_TYPE_OPTIONS`에 `{ value: 'CONTRACT', label: '계약직' }` 추가
- `HIRE_TYPES` 스키마에 `'CONTRACT'` 추가
- hireType은 String 필드이므로 DB 마이그레이션 불필요

**2. vitest 설정 수정 (e2e 파일 분리)**
- 문제: e2e/Playwright 테스트 파일 27개가 vitest에 포함되어 `test.describe()` 에러 발생
- 수정: `include: ['src/**/*.{test,spec}.{ts,tsx}']` + `exclude: ['e2e/**', 'node_modules/**', '.next/**']`
- 결과: 17파일 341테스트 클린 통과 (1.44s)

**3. EncryptionService 단위 테스트 13개 추가**
- 주민등록번호/계좌번호 암복호화 라운드트립
- 빈 문자열, 한글, 긴 텍스트(256자) 처리
- IV 랜덤성 검증 (같은 평문 → 다른 암호문)
- authTag/ciphertext 변조 시 에러 감지 (인증 암호화 무결성)
- 키 누락/길이 부족 에러 처리

**4. Go/No-Go 코드 감사 (변경 없음, 검증만)**

| Go/No-Go 항목 | 판정 | 핵심 근거 |
|---------------|------|----------|
| 급여 계산 정확도 99%+ | ✅ GO | PayrollAccuracyVerification 3시나리오 통과, IEEE 754 1원 오차만 |
| 4대보험+소득세 자동계산 | ✅ GO | 국민연금/건강/장기요양/고용 공식 CLAUDE.md 100% 일치, 간이세액표 시드 완비 |
| 52시간 초과 감지 | ✅ GO | API + UI + hook 완성, ISO week 그룹핑 |
| PII 암호화+RBAC | ✅ GO | AES-256-GCM + canViewSensitive + 감사로그 |
| 배포 설정 | ✅ 준비 완료 | Dockerfile + docker-compose.prod + .env.production.example + Sentry |
| 셀프 온보딩 3분 | ⏳ 수동 필요 | 인프라 준비 완료, UX 타이밍 측정 필요 |
| 50명 일괄 10초 | ⏳ 수동 필요 | benchmark-payroll.mjs 존재, DB 기동 후 실행 필요 |

### 수정 파일 (영향 범위)

| 레이어 | 파일 | 변경 |
|--------|------|------|
| Constants | `src/lib/constants.ts` | HIRE_TYPE_OPTIONS에 CONTRACT 추가 |
| Schema | `src/presentation/api/schemas/employee.ts` | HIRE_TYPES에 CONTRACT 추가 |
| Config | `vitest.config.ts` | include/exclude 설정 추가 |
| Test | `src/infrastructure/encryption/__tests__/EncryptionService.test.ts` | 신규 (13 테스트) |

### 설계 결정

**vitest include 명시 vs exclude만 추가** → **include 명시** 선택

기존: include 미설정으로 프로젝트 전체 `*.test.*` 탐색 → e2e + .next 내부 파일 포함됨
수정: `src/**/*.{test,spec}.{ts,tsx}`로 탐색 범위 제한 + e2e/.next 명시적 제외

### 검증

- `npx vitest run`: ✓ 17파일 341테스트 전부 통과 (1.61s)
- `tsc --noEmit`: ✓ (변경 범위 소규모)

### 교훈 / 주의사항

1. **vitest에 include 미설정 시 위험**: 기본 설정은 프로젝트 전체를 탐색하므로, Playwright 등 다른 테스트 프레임워크 파일이 포함될 수 있음. 초기 설정 시 include를 반드시 명시.
2. **보안 기능은 단위 테스트 필수**: EncryptionService 같은 보안 핵심 서비스에 테스트가 없으면 Go/No-Go에서 걸림. 보안 서비스 작성 시 테스트를 함께 작성할 것.
3. **Go/No-Go 감사는 문서화 가치**: 코드 변경 없이 검증만 수행해도 판정 근거를 DEVLOG에 기록하면 향후 "왜 출시했는가?" 질문에 답변 가능.

---

## [2026-03-16] 급여 항목 동기화 API + 직원 등록 폼 UX 개선

### 배경 (왜)

직원 등록 시 `POST /api/employees`에서 활성 SalaryRule → EmployeeSalaryItem 자동 복사가 있지만, **기존 등록 직원** 또는 **새 SalaryRule 추가 후 기존 직원**에게는 누락된 급여 항목이 전파되지 않았음. 직원 상세 급여탭에서 빈 상태일 때 동기화할 수단이 없어, 관리자가 수동으로 항목을 하나씩 추가해야 하는 UX 문제.

또한 직원 등록 폼에서 주민등록번호가 선택값이었고, 폼 순서가 인사정보 → 개인정보 → 급여정보로 비직관적이었음.

### 변경 내용 (무엇을)

**1. 급여 항목 동기화 API**
- `POST /api/employees/[id]/salary-items`: 활성 SalaryRule 중 해당 직원에게 누락된 항목만 `createMany`로 생성 (code 기준 멱등)
- 응답: `{ created: N, items: [...] }` — 이미 모두 있으면 `created: 0`
- AuditLog 기록: synced 코드 목록

**2. 프론트엔드 동기화 UI**
- `syncSalaryItems(employeeId)` 훅 추가 (`useEmployees.ts`)
- SalaryTab: salaryItems가 비어있을 때 전체 EmptyState + "급여 규칙에서 항목 가져오기" 버튼
- 개별 지급/공제 EmptyState에도 동기화 ghost 버튼 추가

**3. 직원 등록 폼 UX 개선**
- 폼 순서: 기본정보(이름/주민번호/연락처/주소) → 인사정보(부서/직급/입사일) → 급여정보
- 주민등록번호: 선택 → 필수 (Zod 13~14자 검증)
- 등록 완료 후 직원 목록이 아닌 **직원 상세 급여탭으로 자동 이동** (`?tab=salary`)
- 직원 상세 페이지: URL `?tab=salary` 파라미터로 초기 탭 지정 가능

**4. 시드 데이터 PII 보강**
- 직원 5명 + 관리자/매니저에 전화번호, 주소, 은행명, 주민번호, 계좌번호 추가
- `encryptPII()` 함수로 AES-256-GCM 암호화 (EncryptionService 동일 포맷)

### 수정 파일 (영향 범위)

| 레이어 | 파일 | 변경 |
|--------|------|------|
| API | `src/app/api/employees/[id]/salary-items/route.ts` | POST handlePost 추가 |
| Hook | `src/hooks/useEmployees.ts` | `syncSalaryItems` 함수 추가 |
| Hook | `src/hooks/index.ts` | re-export 추가 |
| UI | `src/app/(admin)/employees/[id]/page.tsx` | SalaryTab EmptyState + 동기화 버튼 + tab 파라미터 |
| UI | `src/app/(admin)/employees/list/page.tsx` | 폼 순서 재구성 + 주민번호 필수 + 급여탭 이동 |
| Schema | `src/presentation/api/schemas/employee.ts` | rrn 검증 강화 (min 13, max 14, 필수) |
| Seed | `prisma/seed.ts` | PII 데이터 + encryptPII 함수 추가 |

### 설계 결정

**멱등 동기화 (code 기준)** — SalaryRule.code와 EmployeeSalaryItem.code를 비교하여 누락분만 생성. 이미 존재하는 항목의 금액/설정은 덮어쓰지 않음 (직원별 커스터마이즈 보존).

### 검증

- `tsc --noEmit`: ✓ 타입 에러 없음
- Playwright MCP: ✓ 빈 급여탭 → 동기화 버튼 → 23개 항목 생성 → 테이블 정상 표시
- 멱등성: ✓ 이미 항목 있는 직원에게 POST → `created: 0`

---

## [2026-03-15] WorkPolicy로 급여/근태 설정 이동 (Company → WorkPolicy)

### 배경 (왜)

Company 모델에 `lateGraceMinutes`, `earlyLeaveGraceMinutes`, `nightWorkStartTime`, `nightWorkEndTime`, `overtimeThresholdMinutes`, `monthlyWorkHours` 6개 설정이 있어 **회사 전체에 단일 값만 적용** 가능했음. 직원 그룹(사무직/생산직/파트타임 등)별로 다른 근로정책을 적용할 수 없는 구조적 한계.

WorkPolicy는 이미 `workStartTime`, `workEndTime`, `breakMinutes` 등 근무시간 설정을 보유하고 있었으므로, 관련 설정을 WorkPolicy로 통합하면 **직원별 정책 배정**이 가능해짐.

### 변경 내용 (무엇을)

- Company → WorkPolicy로 6개 필드 이동: `lateGraceMinutes`, `earlyLeaveGraceMinutes`, `nightWorkStartTime`, `nightWorkEndTime`, `overtimeThresholdMinutes`, `monthlyWorkHours`
- WorkPolicy에 4개 신규 필드 추가: `weeklyHoliday`, `weeklyWorkHours`(기본 40), `weeklyOvertimeLimit`(기본 12), `monthlyOvertimeLimit`(기본 52)
- `ClassifyInput.company` 속성 제거 → `workPolicy`에서 모든 설정 로딩
- 근태 분류(AttendanceClassifier) 및 급여 계산(CalculatePayrollUseCase)이 직원의 workPolicy에서 설정을 읽도록 변경
- API 5개(check-in/check-out/manual/calendar/work-policy) 수정 — 직원별 workPolicy 로딩
- UI 3개(회사설정/근로정책설정/근태달력) 수정 — 데이터 소스 변경 반영

### 수정 파일 (영향 범위)

| 레이어 | 파일 | 변경 |
|--------|------|------|
| Schema | `prisma/schema.prisma` | Company 6필드 제거, WorkPolicy 10필드 추가 |
| Migration | `prisma/migrations/20260315100000_.../migration.sql` | ADD → COPY → DROP 3단계 |
| Domain | `src/domain/services/types.ts` | `ClassifyInput.company` 제거, `workPolicy`에 필드 추가 |
| Domain | `src/domain/services/AttendanceClassifier.ts` | company 참조 → workPolicy 참조 |
| Domain Test | `src/domain/services/__tests__/AttendanceClassifier.test.ts` | 테스트 픽스처 업데이트 |
| Port | `src/application/ports/ICompanyRepository.ts` | 반환 타입에서 제거된 필드 삭제 |
| Port | `src/application/ports/IWorkPolicyRepository.ts` | 새 필드 반영 |
| UseCase | `src/application/use-cases/payroll/CalculatePayrollUseCase.ts` | workPolicy에서 설정 로딩 |
| Repository | `src/infrastructure/persistence/repositories/AttendanceRepository.ts` | 직원별 workPolicy 조회 |
| Repository | `src/infrastructure/persistence/repositories/WorkPolicyRepository.ts` | 새 필드 포함 |
| DI | `src/infrastructure/di/container.ts` | 의존성 업데이트 |
| API | `src/app/api/attendance/check-in/route.ts` | workPolicy 로딩 |
| API | `src/app/api/attendance/check-out/route.ts` | workPolicy 로딩 |
| API | `src/app/api/attendance/manual/route.ts` | workPolicy 로딩 |
| API | `src/app/api/attendance/calendar/route.ts` | workPolicy 로딩 |
| API | `src/app/api/settings/work-policy/route.ts` | 새 필드 CRUD |
| API | `src/app/api/settings/work-policy/[id]/route.ts` | 새 필드 CRUD |
| API | `src/app/api/settings/company/route.ts` | 제거된 필드 삭제 |
| API | `src/app/api/super-admin/tenants/route.ts` | company 필드 조정 |
| UI | `src/app/(admin)/settings/company/page.tsx` | 이동된 필드 제거 |
| UI | `src/app/(admin)/settings/work-policy/page.tsx` | 새 필드 편집 UI |
| UI | `src/app/(admin)/attendance/calendar/page.tsx` | workPolicy 데이터 소스 |
| UI | `src/app/(admin)/employees/[id]/page.tsx` | 직원 상세 정책 표시 |
| UI Component | `src/components/attendance/AttendanceCalendarCell.tsx` | workPolicy 참조 |
| UI Component | `src/components/attendance/AttendanceRecordModal.tsx` | workPolicy 참조 |
| Hook | `src/hooks/useAttendance.ts` | workPolicy 데이터 패칭 |
| Seed | `prisma/seed.ts` | 기본 workPolicy에 이동된 값 설정 |
| Script | `scripts/create-sysadmin.ts` | company 생성 시 제거된 필드 삭제 |
| Script | `scripts/reset-test-company.ts` | (신규) 테스트 회사 리셋 스크립트 |

### DB 마이그레이션

**마이그레이션명**: `20260315100000_move_settings_to_work_policy`

**3단계 안전 마이그레이션**:
1. **ADD**: WorkPolicy에 10개 컬럼 추가 (DEFAULT 값 포함 → 기존 행 안전)
2. **COPY**: `UPDATE work_policies SET ... FROM companies` — 기존 Company 값을 WorkPolicy로 복사
3. **DROP**: Company에서 6개 컬럼 제거

**데이터 이동**: 있음 (Step 2). 기존 회사의 설정 값이 해당 회사의 WorkPolicy 레코드로 복사됨.

**롤백 주의**: Step 3에서 Company 컬럼이 삭제되므로, 롤백 시 데이터 수동 복구 필요.

### 설계 결정

**Company에 중복 유지 vs 완전 제거** → **완전 제거** 선택

| 대안 | 장점 | 단점 |
|------|------|------|
| Company에 중복 유지 (fallback) | 하위 호환, 점진적 전환 | 데이터 불일치 위험, 어디서 읽을지 혼란 |
| **Company에서 완전 제거** ✅ | 단일 소스 원칙, 명확한 데이터 흐름 | 한 번에 모든 참조 수정 필요 |

**선택 이유**: 중복 유지 시 "어떤 값이 진짜인가?" 혼란이 s0에서 이미 발생한 문제 (`baseSalary` 이중 관리). 한 번에 정리하는 비용이 나중에 불일치 디버깅하는 비용보다 낮음.

### 검증

- `tsc --noEmit`: ✓ 타입 에러 없음
- 단위 테스트 301개: ✓ 전체 통과
- `next build`: ✓ 빌드 성공

### 교훈 / 주의사항

1. **DB 마이그레이션은 ADD→COPY→DROP 순서 필수**: 한 번에 DROP하면 데이터 유실. DEFAULT 값이 있어야 기존 행이 안전.
2. **도메인 타입(`ClassifyInput`) 변경은 파급 범위가 크다**: 도메인 타입 하나 변경에 22개 파일 수정. 변경 전에 `Grep`으로 참조 범위를 반드시 확인.
3. **Company에 "설정"을 넣지 말 것**: 향후 설정 추가 시 Company가 아닌 해당 도메인의 설정 엔티티(WorkPolicy, SalaryRule 등)에 배치.
4. **직원별 정책 로딩 패턴**: `employee → workPolicyId → workPolicy` 조인이 필요한 API에서는 성능을 위해 include/join을 사용하고, N+1 쿼리 주의.

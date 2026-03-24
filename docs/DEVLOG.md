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

## [2026-03-25] 급여대장 2행 레이아웃 리디자인 + 급여이력 직원수 버그 수정

### 배경 (왜)

1. **급여대장 가로폭 문제**: 지급+공제 항목이 1행에 모두 나열되어 15+ 컬럼 → 가로 스크롤 필수. 한국 표준 급여대장 양식과 괴리.
2. **급여이력 직원수 빈칸**: `SalaryCalculationRepository.getHistory()`가 `employeeCount`로 반환하지만 프론트엔드는 `totalEmployees`를 기대 → 필드명 불일치 버그.

### 변경 내용 (무엇을)

1. **급여대장 2행 레이아웃** (`src/app/(admin)/payroll/ledger/page.tsx`):
   - 1인 1행 → 1인 2행: 인적사항 | 지급내역 | 공제내역 | 차인지급액 4개 섹션
   - 2단 그룹 헤더: 상위(섹션명) + 하위(개별항목) 2행
   - `splitHalf()` 함수로 지급/공제 항목을 상단/하단 행에 자동 분배
   - 직원별 `<tbody>` 분리 → Tailwind `group` hover 정상 동작
   - `rowSpan=2` 병합: 사번, 총지급, 총공제, 차인지급액
   - 섹션 구분선 `border-l-2`, 합계 행도 동일 2행 구조

2. **급여이력 직원수 버그** (`src/app/api/payroll/history/route.ts`):
   - API 응답 평탄화: `employeeCount` → `totalEmployees` 매핑 추가

### 수정 파일 (영향 범위)

- `src/app/(admin)/payroll/ledger/page.tsx` — 전면 리디자인 (201줄 변경)
- `src/app/api/payroll/history/route.ts` — 필드 매핑 5줄 추가

### 설계 결정

- **Option 2 선택** (인적사항 2줄 | 지급 2줄 | 공제 2줄 | 차인지급): 한국 표준 급여대장 양식에 가장 근접
- **2행 고정**: 항목 15+15개 극단 케이스에서도 가로 스크롤은 기존 대비 절반 수준. 3행 이상은 rowSpan 복잡도 + 가독성 저하로 비채택
- **API 평탄화**: CLAUDE.md "API 응답 평탄화 규칙" 준수 (Repository 필드명 → 프론트 기대 필드명)

### 검증

- tsc 에러 없음
- 클린 아키텍처 전면 감사: 123 API Route + 36 Domain + 102 Application → **100% 준수** 재확인

### 교훈 / 주의사항

- **필드명 불일치는 반복되는 버그 패턴**: `e404f57` (nested→flat), 이번 `employeeCount→totalEmployees`. API Route에서 프론트 기대 필드와 명시적으로 매핑하는 습관 필수.
- **HTML `<table>` 2행 구조**: `<tr>` 안에 `<tr>` 불가, `group` hover는 직원별 `<tbody>` 분리로 해결.

---

## [2026-03-24] 급여 확정 24시간 취소 유예 제거 — 확정 불가역 전환

### 배경 (왜)

급여 확정(CONFIRMED) 시 급여대장(PayrollMonthly) 불변 스냅샷이 즉시 생성되고, 급여명세서 이메일 발송까지 가능한 상태인데 24시간 내 취소를 허용하는 것은 아키텍처적 모순. "불변 스냅샷"이 삭제 가능하고, 이미 이메일로 발송된 명세서와 취소된 급여 간 불일치가 발생할 수 있음. 또한 연쇄 취소 로직(급여→근태)의 복잡성도 문제.

### 변경 내용 (무엇을)

1. **CancelPayrollUseCase**: 24시간 체크 로직 전체 삭제. `force=false`면 CONFIRMED 취소 차단 (`확정된 급여는 취소할 수 없습니다.`). `force=true`는 SYSTEM_ADMIN 이력 삭제 전용으로만 유지
2. **payroll/cancel API**: `force=true` 사용 시 `SYSTEM_ADMIN` 역할 검증 추가 (403 반환)
3. **급여 실행 UI**: `24시간 이내에 취소 가능` → `확정 후에는 수정하거나 취소할 수 없습니다` (red 경고). 확정 배너 문구도 변경
4. **근태 달력 UI**: 급여 CONFIRMED 시 연쇄 취소 로직 제거. 확정 취소 버튼 비활성화 + tooltip 안내

### 수정 파일 (영향 범위)

| 레이어 | 파일 | 변경 |
|--------|------|------|
| Application | CancelPayrollUseCase.ts | 24시간 로직 삭제, CONFIRMED 취소 차단 |
| API | payroll/cancel/route.ts | force=true SYSTEM_ADMIN 제한 |
| UI | payroll/run/page.tsx | 24시간 문구 → 불가역 경고, 확정 배너 문구 변경 |
| UI | attendance/calendar/page.tsx | 연쇄 취소 제거, 버튼 비활성화 |

### DB 마이그레이션

없음 (코드 레벨 변경만)

### 설계 결정

1. **확정 = 최종 확정**: CONFIRMED는 PAID와 동일하게 취소 불가. 실수 시 정정 급여(Off-Cycle, Phase 1.5)로 처리
2. **force=true 유지**: PayrollHistory 이력 삭제 기능에서 사용 중이므로 경로 자체는 보존, SYSTEM_ADMIN만 접근 가능
3. **근태 취소 차단**: 급여 확정 상태에서 근태 확정 취소도 차단하여 데이터 정합성 보장

### 검증

- `npm run build`: ✓ 컴파일 성공

### 교훈 / 주의사항

1. **불변 스냅샷과 취소 가능은 양립 불가**: "불변" 데이터를 생성하면서 취소 시 삭제하는 것은 설계 모순. 처음부터 확정의 불가역성을 명확히 정의해야 함
2. **이메일 발송 후 취소 문제**: 급여명세서 이메일 발송 기능 추가로 취소 불가가 더 중요해짐 — 이미 발송된 명세서를 "없던 일"로 할 수 없음

---

## [2026-03-24] 급여명세서 이메일 발송 + 근태확정 재분류 + 근무정책 UI 개선

### 배경 (왜)

1. 급여명세서를 직원에게 이메일로 발송하고, 발송 이력과 수신(열람) 확인 기능 필요
2. 근무정책의 연장근로 최소기준(overtimeMinThreshold) 변경 후 기존 출퇴근 기록에 소급 적용 안 되는 문제 — 확정 시 재분류 필요
3. 근무정책 설정이 21개로 늘어났는데 640px 모달에 세로 나열만 되어 UX 개선 필요

### 변경 내용 (무엇을)

**1. 급여명세서 이메일 발송 시스템**
- DB: `PayslipEmailLog` 모델 (발송 이력 + 트래킹 토큰) + `PayslipEmailStatus` enum (PENDING/SENT/OPENED/FAILED) + `AuditAction.SEND`
- RLS: `payslip_email_logs` FORCE RLS + `record_payslip_email_open()` SECURITY DEFINER 함수 (트래킹 픽셀 RLS 우회)
- Infrastructure: `EmailService.sendPayslipEmail()` — Resend API 연동 (미설정 시 콘솔 로그 fallback) + `PayslipEmailTemplate.ts` HTML 이메일 템플릿 (인라인 CSS, 모바일 호환)
- UseCase 3개: `SendPayslipEmailUseCase` (순차 발송 + AuditLog), `GetPayslipEmailHistoryUseCase`, `RecordPayslipEmailOpenUseCase` (멱등)
- API: `POST /api/payroll/payslips/email` (발송), `GET .../history` (이력), `GET .../email-read/[token]` (1x1 GIF 트래킹 픽셀, 공개)
- UI: `EmailSendDialog` (직원 체크박스 선택 + 일괄 발송) + `EmailHistoryPanel` (슬라이드 패널, 상태 뱃지, 재발송, 30초 자동 갱신)
- DI 컨테이너: `PayslipEmailLogRepository` + `EmailService` + UseCase 3개 등록

**2. 근태확정 시 현재 근무정책으로 재분류**
- `ConfirmAttendanceUseCase`: 확정 시 각 일별 Attendance에 대해 `AttendanceClassifier.classify()` 재호출
- 현재 workPolicy의 `overtimeMinThreshold`/`overtimeRoundingMinutes` 소급 적용
- 휴일 여부 재판정: `workDays` + `CompanyHoliday` 기준으로 `isHoliday` 자동 설정
- 변경된 레코드만 DB 업데이트 후 합산
- `AttendanceRepository.updateClassification()` 메서드 추가

**3. 근무정책 수정 모달 UI 개선**
- `Modal` xl 사이즈 추가 (max-w-900px)
- 6섹션 세로 → 5섹션 2컬럼 카드 레이아웃 (근무시간+휴게 / 출퇴근관리+지각조퇴 좌우 배치)
- 연장/야간근로 통합 + 소정근로시간 4컬럼 compact
- 섹션별 아이콘 헤더 (Clock/Coffee/DoorOpen/AlertTriangle/Timer/Calculator)
- 근무정책 저장 버그 수정: `workDays` 문자열↔배열 변환 누락 + `handleSave` catch 블록 추가

### 수정 파일 (영향 범위)

| 레이어 | 파일 | 변경 |
|--------|------|------|
| Schema | prisma/schema.prisma | PayslipEmailLog 모델 + PayslipEmailStatus enum + AuditAction.SEND + 관계 |
| Migration | 3개 | add_payslip_email_log + RLS + SECURITY DEFINER |
| Infrastructure | EmailService.ts | sendPayslipEmail() 추가 (Resend API) |
| Infrastructure | PayslipEmailTemplate.ts | **신규** — HTML 이메일 템플릿 빌더 |
| Repository | PayslipEmailLogRepository.ts | **신규** — 6개 메서드 (create/findByPeriod/findByToken/updateStatus/findLatest/recordOpen) |
| Repository | AttendanceRepository.ts | updateClassification() 추가 |
| UseCase | SendPayslipEmailUseCase.ts | **신규** — 이메일 발송 + AuditLog |
| UseCase | GetPayslipEmailHistoryUseCase.ts | **신규** — 발송 이력 조회 |
| UseCase | RecordPayslipEmailOpenUseCase.ts | **신규** — 트래킹 픽셀 열람 기록 |
| UseCase | ConfirmAttendanceUseCase.ts | 재분류 로직 추가 (AttendanceClassifier 재호출) |
| API | payslips/email/route.ts | **신규** — POST 이메일 발송 |
| API | payslips/email/history/route.ts | **신규** — GET 발송 이력 |
| API | payslips/email-read/[token]/route.ts | **신규** — GET 트래킹 픽셀 (공개) |
| API | payroll/ledger/route.ts | userId 필드 추가 |
| Middleware | proxy.ts | 트래킹 픽셀 publicPaths 추가 |
| DI | container.ts | 1 Repository + 1 Service + 3 UseCase 등록 |
| UI | payslips/page.tsx | 이메일 발송/이력 버튼 + 컴포넌트 통합 |
| UI | payslips/EmailSendDialog.tsx | **신규** — 발송 대상 선택 모달 |
| UI | payslips/EmailHistoryPanel.tsx | **신규** — 발송 이력 슬라이드 패널 |
| UI | work-policy/page.tsx | 2컬럼 레이아웃 + 저장 버그 수정 |
| UI | Modal.tsx | xl 사이즈 추가 |

### DB 마이그레이션

- `20260323131429_add_payslip_email_log`: PayslipEmailLog 테이블 + PayslipEmailStatus enum + AuditAction.SEND
- `20260323131446_add_payslip_email_log_rls`: (빈 마이그레이션)
- `20260323131500_add_payslip_email_log_rls`: RLS + FORCE RLS + `record_payslip_email_open()` SECURITY DEFINER

### 설계 결정

1. **트래킹 픽셀 RLS 우회**: SECURITY DEFINER 함수로 안전하게 우회 — 트래킹 픽셀은 인증 없는 공개 엔드포인트이므로 RLS 세션 변수 없음
2. **Resend fallback**: `RESEND_API_KEY` 미설정 시 콘솔 로그로 대체 — 개발 환경에서 실제 이메일 발송 불필요
3. **근태 재분류 시점**: 확정(Confirm) 시에만 재분류 — 체크아웃 시 분류는 기존 로직 유지, 정책 변경 후 재확정으로 소급 적용
4. **EmailService DI**: Resend 인스턴스를 EmailService 내부에서 관리 — Container에서는 EmailService만 주입

### 검증

- `npm run build`: ✓ 컴파일 성공
- API 테스트 (curl): 근태확정 취소 → 휴일 출퇴근 추가 → 재확정 → 급여 재계산 → 김영수 연장 0→0h, 휴일수당 1,148,304원 확인
- 근무정책 저장: curl로 overtimeRoundingMinutes=60 저장 성공

### 교훈 / 주의사항

1. **근태 데이터 소급**: 근무정책 변경은 체크아웃 시점의 분류에만 영향 — 기존 기록은 재확정해야 소급 적용됨. 재분류 로직이 없으면 사용자가 혼란
2. **RLS + 공개 엔드포인트 충돌**: FORCE RLS가 켜진 테이블에 인증 없는 엔드포인트가 접근하면 차단됨. SECURITY DEFINER 함수로 우회 필요
3. **workDays 타입 불일치**: API 응답 String("1,2,3,4,5") vs 프론트 state number[] — 양방향 변환 필수. TypeScript가 any 타입에서 잡지 못함

---

## [2026-03-23] 근무정책 기능 확장 + 급여대장/명세서 개선 + 직원등록 기본값

### 배경 (왜)

1. 통합 테스트(TEST-SCENARIO-2026-02) 재실행 중 급여대장/명세서에 데이터 불일치 발견
2. 근무정책에 출퇴근 허용시간, 복수 휴게, 연장근로 절사, 판정방식 등 실무 기능 필요
3. 직원 등록 시 기본 그룹/정책/근무지 미선택으로 급여 실행 시 문제 발생 가능

### 변경 내용 (무엇을)

**1. 급여 재계산 버그 수정**
- `CalculatePayrollUseCase:83` — `e.employeeId` → `e.userId` (CONFIRMED 검증 우회 근본 원인)
- 급여 실행 UI: CONFIRMED 상태에서 "계산하기" 비활성화 + 안내 배너

**2. 급여대장 개선**
- ledger/page.tsx: `items`(code 기반) → `payItems/deductionItems`(label 기반) UI 전환
- ConfirmPayrollUseCase: `calc.employeeName` → `calc.user?.name` (사번/이름/부서 null 수정)
- PayrollMonthlyRepository: findByPeriodAndGroup에 user include 추가 (기존 null 데이터 fallback)
- ledger API: 스냅샷 필드 null 시 user 관계에서 fallback

**3. 급여명세서 개선**
- 데이터소스: `usePayrollSpreadsheet`(합산) → `usePayrollLedger`(개별 스냅샷) — "고정수당 900,000" → 직책수당/식대/차량유지비 분리
- 산출근거 표시: 연장수당 "48분", 지각공제 "15분", 시급제 기본급 "157시간"
- GetPayrollDetailUseCase: 시급제 기본급에 hours 필드 + description 보강

**4. 근무정책 기능 확장 (5가지)**
- DB: WorkPolicy 7개 필드 추가 (마이그레이션 `20260323052604`)
  - checkInAllowedMinutes (30), checkOutAllowedMinutes (60)
  - overtimeMinThreshold (0), overtimeRoundingMinutes (0)
  - breakType (FIXED), breakSchedule (Json?), attendanceCalcMode (TIME_BASED)
- AttendanceClassifier: `calculateBreakMins()` TIERED/SCHEDULED 지원, `applyOvertimeRules()` 절사, DURATION_BASED 모드
- CheckIn/CheckOutUseCase: 출퇴근 허용시간 검증 (ValidationError)
- 설정 UI: 5개 섹션 확장 + TIERED/SCHEDULED 동적 폼 (카드 스타일)
- API/Repository: 7개 필드 CRUD + 시드 기본값

**5. 직원 등록 기본값 + 삭제 보호**
- 직원 등록 폼: openCreate 시 기본 급여그룹/근무정책/근무지 자동 선택
- payrollGroupId 필수화 (API 스키마 optional → required)
- 기본 근무지 삭제 차단 (API isDefault 체크 + UI 삭제 버튼 숨김 + 이름 readOnly)

### 수정 파일 (영향 범위)

| 레이어 | 파일 | 변경 |
|--------|------|------|
| Schema | prisma/schema.prisma | WorkPolicy 7개 필드 추가 |
| Migration | 20260323052604_add_work_policy_extensions | 7개 컬럼 (기본값 포함) |
| Seed | prisma/seed.ts | 근무정책 새 필드 기본값 |
| Domain | AttendanceClassifier.ts | calculateBreakMins + applyOvertimeRules + DURATION_BASED |
| UseCase | CalculatePayrollUseCase.ts | e.employeeId → e.userId |
| UseCase | ConfirmPayrollUseCase.ts | calc.user?.name (사번/이름/부서) |
| UseCase | GetPayrollDetailUseCase.ts | 시급제 기본급 hours/description |
| UseCase | CheckIn/OutAttendanceUseCase.ts | 출퇴근 허용시간 검증 |
| Repository | PayrollMonthlyRepository.ts | user include |
| Repository | WorkPolicyRepository.ts | 7개 필드 CRUD |
| API | payroll/ledger/route.ts | user fallback |
| API | work-locations/[id]/route.ts | isDefault 삭제 차단 |
| API | settings/work-policy/*.ts | 7개 필드 반영 |
| Schema | employee.ts (Zod) | payrollGroupId 필수화 |
| UI | payroll/ledger/page.tsx | payItems/deductionItems 렌더링 |
| UI | payroll/payslips/page.tsx | 개별항목 + 산출근거 |
| UI | payroll/run/page.tsx | CONFIRMED 비활성화 + 배너 |
| UI | settings/work-policy/page.tsx | 5개 섹션 + TIERED/SCHEDULED 폼 |
| UI | settings/work-locations/page.tsx | 기본 근무지 보호 |
| UI | employees/list/page.tsx | 기본값 자동 선택 |

### DB 마이그레이션

**`20260323052604_add_work_policy_extensions`**: WorkPolicy에 7개 컬럼 추가 (모두 기본값 → 기존 데이터 영향 없음)

### 설계 결정

1. **급여명세서 데이터소스**: spreadsheet API(합산) → ledger API(스냅샷 개별항목) — PayrollMonthly에 이미 개별 항목이 저장되므로 추가 API 불필요
2. **DURATION_BASED 모드**: 총 근무시간만 충족하면 지각/연장 미적용 — 현재 TIME_BASED가 기본값이므로 기존 동작 변경 없음
3. **breakSchedule JSON**: TIERED/SCHEDULED 설정을 별도 테이블 없이 JSON으로 저장 — 정규화보다 유연하고 WorkPolicy 읽기 시 추가 JOIN 불필요
4. **직원등록 기본값**: UI에서만 기본 선택 (서버 fallback은 방어적) — 관리자가 명시적으로 다른 값을 선택할 수 있음

### 검증

- `tsc --noEmit`: ✓ 타입 에러 없음
- `vitest run`: ✓ 21파일 399 테스트 전체 통과
- 통합 테스트 시나리오(TEST-SCENARIO-2026-02): 단계 0~8 전체 완료
- Playwright MCP: 급여대장/명세서/근무정책 설정 UI 검증

### 교훈 / 주의사항

1. **Prisma 필드명 주의**: `e.employeeId`(존재하지 않음) vs `e.userId`(실제 필드명) — TypeScript가 `any` 타입에서 잡지 못함. Prisma 반환 객체의 필드명을 항상 스키마와 대조할 것
2. **PayrollMonthly 스냅샷 의존**: 급여대장/명세서는 PayrollMonthly.payItemsSnapshot에서 읽음. 확정 시 스냅샷이 올바르게 저장되지 않으면 이후 조회에서 문제 발생
3. **dev 서버 Prisma 캐시**: `prisma generate` 후 `.next` 캐시가 이전 client를 사용할 수 있음. 새 필드 추가 후 반드시 `.next` 삭제 + dev 서버 재시작
4. **2026년 간이세액표**: 시드에 2025년만 포함. 2026년 급여 계산 시 수동으로 복사 필요 (시드 자동화 필요)

---

## [2026-03-22] 그룹 기반 관리 + 세부 권한 시스템 — Phase 1 기반 구축

### 배경 (왜)

직원이 많거나 부서/지점별 급여일·관리자가 다른 경우, 현재 "회사 전체 일괄" 방식의 근태 확정/급여 실행은 다음 문제를 일으킨다:
1. 한 부서의 근태 미확정이 전체 급여 실행을 블록
2. 그룹별 다른 급여일/관리자 설정 불가
3. MANAGER 역할에 근태 확정/휴가 승인/급여 관련 권한 없음

시프티(경쟁사)의 지점 기반 권한 시스템을 참고하여 설계. 사용자 결정: PayrollGroup 별도 모델 + 시프티 스타일 세부 권한 토글 + 그룹 관리자 급여 확정 가능.

### 전체 계획 (3 Phase)

**Phase 1 (이번 작업)**: PayrollGroup 모델 + CRUD API + DI + 시드
**Phase 2 (완료)**: 근태확정/급여실행에 payrollGroupId 필터 + 그룹관리 설정 UI
**Phase 3-1 (완료)**: RolePermission 모델 + withPermission 미들웨어 + 권한 설정 UI + 핵심 API 12개 적용
**Phase 3-2 (다음)**: Role enum 확장 (GENERAL_MANAGER, GROUP_MANAGER) + 전체 API 전환

상세 설계서: `.claude/plans/frolicking-hatching-finch.md`

### 변경 내용 (무엇을) — Phase 1 + Phase 2

**1. DB 스키마 (Prisma)**
- `PayrollGroup` 모델 신규 (name, code, payDay, isDefault, isActive, sortOrder)
- `PayrollGroupManager` 모델 신규 (그룹↔관리자 다대다)
- `User.payrollGroupId` nullable FK 추가
- `Company.payrollGroups` relation 추가
- RLS 정책 2개 추가 (payroll_groups, payroll_group_managers)
- TENANT_MODELS에 PayrollGroup, PayrollGroupManager 추가

**2. Clean Architecture 레이어**
- Repository: `PayrollGroupRepository` (findAll, findById, create, update, softDelete, manager 관리, member 관리)
- UseCase: `CrudPayrollGroupUseCase` (CRUD + 멤버 배정 + 관리자 배정)
- DI 컨테이너: payrollGroupRepo + crudPayrollGroupUseCase 등록

**3. API Routes (3개)**
- `GET/POST /api/settings/payroll-groups` — 그룹 목록/생성
- `GET/PUT/DELETE /api/settings/payroll-groups/[id]` — 단건 조회/수정/삭제
- `GET/POST /api/settings/payroll-groups/[id]/members` — 멤버 조회/배정/해제/관리자 추가/제거

**4. SWR 훅**
- `usePayrollGroups()`, `usePayrollGroupMembers(groupId)`, `usePayrollGroupMutations()`

**5. 시드 데이터**
- `seedDefaultPayrollGroup()`: 기본 그룹 자동 생성 + 전 직원 배정
- 기존 회사에도 시드 실행 시 기본 그룹 생성

**14. Zod 스키마 변경** (attendance.ts, payroll.ts)
- confirmAttendanceSchema, calculatePayrollSchema, confirmPayrollSchema에 payrollGroupId 추가

**15. Port 인터페이스 변경** (ISalaryCalculationRepository.ts)
- deleteByPeriodAndUserIds, updateStatusByUserIds 메서드 선언 추가

**16. 달력 셀 휴가 오버플로우 방지** (AttendanceCalendarCell.tsx)
- 긴 휴가 유형명에 truncate + title 툴팁 추가

**17. RolePermission 모델 + 마이그레이션** (schema.prisma)
- 역할별 세부 권한 설정 DB 모델 (companyId, role, category, permission, enabled)
- RLS 정책 + TENANT_MODELS 추가

**18. Domain: Permission 상수** (src/domain/value-objects/Permission.ts)
- 5개 카테고리 × 11개 세부 권한 + MANAGER 기본 권한 상수

**19. withPermission 미들웨어** (src/presentation/middleware/withPermission.ts)
- COMPANY_ADMIN/SYSTEM_ADMIN → 항상 통과, MANAGER → DB 권한 확인, EMPLOYEE → 거부
- withRole과 동일 시그니처로 교체 용이

**20. 핵심 API 8개 withPermission 전환**
- 근태: confirm/cancel/manual/batch → ATTENDANCE_MGMT
- 휴가: approve/reject/grant → LEAVE_MGMT
- 설정: payroll-groups GET → GROUP_MGMT

**21. 권한 설정 API + UI**
- GET/PUT /api/settings/permissions — 역할별 권한 조회/저장
- /settings/permissions 페이지 — 시프티 스타일 카테고리별 체크박스 토글
- 사이드바 설정 하위에 '권한 설정' 메뉴 추가

**22. 시드: 기본 역할 권한** (seed.ts)
- seedRolePermissions(): MANAGER 역할 11개 기본 권한 자동 생성

### 수정 파일 (영향 범위)

| 파일 | 변경 |
|------|------|
| `prisma/schema.prisma` | PayrollGroup + PayrollGroupManager 모델 + User.payrollGroupId |
| `prisma/seed.ts` | seedDefaultPayrollGroup 함수 + 호출 |
| `src/infrastructure/persistence/prisma/tenant-extension.ts` | TENANT_MODELS 2개 추가 |
| `src/infrastructure/persistence/repositories/PayrollGroupRepository.ts` | 신규 |
| `src/application/use-cases/settings/CrudPayrollGroupUseCase.ts` | 신규 |
| `src/infrastructure/di/container.ts` | payrollGroupRepo + crudPayrollGroupUseCase 등록 |
| `src/app/api/settings/payroll-groups/route.ts` | 신규 |
| `src/app/api/settings/payroll-groups/[id]/route.ts` | 신규 |
| `src/app/api/settings/payroll-groups/[id]/members/route.ts` | 신규 |
| `src/hooks/usePayrollGroups.ts` | 신규 |
| `src/app/api/attendance/confirm/route.ts` | payrollGroupId 필터 추가 |
| `src/app/api/payroll/calculate/route.ts` | payrollGroupId 전달 |
| `src/app/api/payroll/confirm/route.ts` | 그룹 범위 검사 + updateStatusByUserIds |
| `src/application/use-cases/payroll/CalculatePayrollUseCase.ts` | payrollGroupId 매개변수 + 그룹 필터 |
| `src/application/ports/ISalaryCalculationRepository.ts` | 새 메서드 선언 |
| `src/presentation/api/schemas/attendance.ts` | payrollGroupId 스키마 |
| `src/presentation/api/schemas/payroll.ts` | payrollGroupId 스키마 |
| `src/hooks/usePayroll.ts` | payrollGroupId 파라미터 추가 |
| `src/hooks/useAttendance.ts` | payrollGroupId 파라미터 추가 |
| `src/app/(admin)/payroll/run/page.tsx` | 그룹 Select + 필터 연동 |
| `src/app/(admin)/attendance/calendar/page.tsx` | 그룹 Select + 확정바 연동 |
| `src/app/(admin)/settings/payroll-groups/page.tsx` | 신규 — 그룹 관리 UI |
| `src/components/layout/AdminSidebar.tsx` | 메뉴 추가 |
| `src/components/attendance/AttendanceCalendarCell.tsx` | 휴가명 truncate |

### DB 마이그레이션

- `20260322013910_add_payroll_group` — payroll_groups + payroll_group_managers 테이블 + users.payroll_group_id FK
- RLS: `tenant_isolation_payroll_groups`, `tenant_isolation_payroll_group_managers` (text cast)

### 설계 결정

1. **PayrollGroup ≠ Department**: 부서는 조직도용, 급여그룹은 급여 운영 단위. "부서 기반 자동 그룹 생성" 편의 기능은 Phase 3에서 제공
2. **직원 1명 = 그룹 1개**: 급여는 중복 지급 불가. 시프티의 multi-select와 달리 1:N 관계
3. **PayrollGroupManager 다대다**: 한 관리자가 여러 그룹을, 한 그룹에 여러 관리자 가능
4. **isDefault 그룹**: 회사 가입 시 자동 생성, 삭제 불가. 그룹 미배정 방지
5. **payrollGroupId nullable**: 기존 데이터 100% 하위 호환. null이면 기존 동작 유지

### 검증

- `npx tsc --noEmit` — 타입 에러 0
- `npx vitest run` — 21파일 399 테스트 전체 통과
- `npx prisma db seed` — 기본 그룹 생성 + 전 직원 배정 확인
- RLS 정책 생성 확인 (psql)

### 교훈 / 주의사항

- **RLS text cast**: company_id가 TEXT 타입이라 `::uuid` 캐스트 실패. `company_id::text = current_setting(...)` 패턴 사용
- **시드 early return**: `seed.ts`에서 회사 존재 시 early return하므로, 새 시드 함수는 early return 분기에도 추가해야 함
- **Phase 2에서 Role enum 변경 시**: GENERAL_MANAGER, GROUP_MANAGER 추가 → 기존 MANAGER 마이그레이션 필요. withRole 미들웨어도 수정 필요
- **Phase 3에서 급여 API 변경 시**: `deleteByPeriod`를 `deleteByPeriodAndUserIds`로 변경이 가장 중요 (다른 그룹 결과 보존)

---

## [2026-03-22] 회원가입 검증 + 배치 근태 추가 + 급여규칙 수정 + 휴가↔근태 연동

### 배경 (왜)

수동 테스트 과정에서 다수의 버그와 UX 개선 사항을 발견. 사업자번호 유효성 미검증, 근태 기록 한 번에 1일만 입력 가능, 급여규칙 추가 시 enum 불일치·sortOrder 누락, 승인된 휴가가 달력에 미표시 등.

### 변경 내용 (무엇을) — 30개 커밋

**1. 사업자번호 유효성 검증 + 회원가입 보호**
- `BusinessNumber` 값 객체: 국세청 체크섬 알고리즘 + 자동 하이픈 포맷팅 (단위 테스트 15개)
- 회원가입: Zod refine + DB unique 제약 (마이그레이션 `20260321120000`)
- 설정 페이지: 상호/사업자번호 readOnly + 소셜 로그인 숨김
- 운영 데이터 초기화 스크립트 (`scripts/clear-operational-data.ts`)

**2. 클린 아키텍처 전체 감사 + 100% 준수 달성**
- 121 API Route 감사: 100% DI 컨테이너 경유 확인
- `GrantLeaveUseCase`의 Prisma 타입 의존 제거 → Domain `LeaveType` 분리

**3. 출퇴근 기록 복수 날짜 일괄 추가**
- `BatchManualAttendanceUseCase` + `POST /api/attendance/manual/batch`
- 모달 UI: 시작일~종료일, 주말/공휴일 제외 체크, 프리뷰 카운트
- 기존 기록 덮어쓰기 방지 + 저장 전 확인창
- soft-delete + unique 충돌 수정 (단일/배치 양쪽)
- 출근 09:00 / 퇴근 18:00 기본값

**4. 급여규칙 버그 수정 6건**
- PaymentCycle `YEARLY` → `ANNUAL` enum 불일치
- soft-delete + unique 충돌 (삭제 후 동일 코드 재생성)
- sortOrder API 미전달
- A01 기본급 수당 탭 표시 + Lock 보호
- 급여규칙 동기화 시 삭제된 규칙 항목 soft-delete
- 시급제: 통상시급(자동) 숨김 + A01 안내

**5. 휴가 관리 개선**
- 휴가 목록 빈 필드 수정 (API 응답 평탄화)
- 휴가 수정/삭제 기능 (`PUT/DELETE /api/leave/request/[id]`)
- APPROVED 삭제 시 잔여일수 자동 복원
- 승인 휴가 달력 표시 (API 오버레이 + 보라색 셀)
- 근태 확정 시 LEAVE 레코드 자동 생성
- 달력 휴가 셀 클릭 시 모달 방지 → 토스트

### DB 마이그레이션

- `20260321120000_add_unique_business_number` — companies.business_number UNIQUE 제약

### 설계 결정

1. **배치 근태 추가 → skip 전략**: 기존 기록이 있는 날짜는 덮어쓰지 않고 건너뜀. upsert보다 안전.
2. **달력 휴가 표시 → API 오버레이**: Attendance 레코드 없이도 LeaveRequest로 즉시 표시. 확정 시 LEAVE 레코드 생성.
3. **사업자번호 체크섬**: 국세청 가중치 알고리즘 직접 구현 (외부 의존성 없음, domain 레이어).
4. **soft-delete + unique 충돌 패턴**: create 시 soft-deleted 동일 레코드를 hard delete 후 생성 (SalaryRule, Attendance 양쪽).

### 교훈

- **soft-delete + unique 제약은 항상 충돌 가능**: create 메서드에서 사전 hard delete 패턴을 기본으로 적용할 것
- **API 응답 평탄화 누락이 반복됨**: 새 API 생성 시 프론트엔드 타입과 대조 필수 (이번이 3번째)
- **catch 블록에서 에러 삼키지 않기**: `catch {}` → `catch (err) { console.error + err.message }` 패턴 필수

### 검증

- `npx tsc --noEmit` — 타입 에러 0
- `npx vitest run` — 21파일, 399 tests 모두 통과
- 브라우저 수동 테스트: 회원가입, 출퇴근 배치 추가, 급여규칙 CRUD, 휴가 부여/수정/삭제/달력 표시

---

## [2026-03-21] 에러 메시지 한국어 전환 + 프론트엔드 에러 핸들링 개선

### 배경 (왜)

1. 휴가 승인 시 409 Conflict(근태↔휴가 중복 방지)가 발생하면 "승인에 실패했습니다."라는 하드코딩 메시지만 표시 — 사용자가 실패 원인을 알 수 없음
2. 급여 실행 "계산하기" 클릭 시 이미 확정된 급여가 있으면 `handleCalculate`에 catch 블록이 없어 런타임 에러가 페이지에 그대로 노출됨
3. UseCase의 ValidationError/EntityNotFoundError 메시지가 영어로 작성되어 있어 사용자에게 노출 시 혼란

### 변경 내용 (무엇을)

**1. 프론트엔드 catch 블록 5곳 에러 핸들링 개선**
- `catch { toast.error('하드코딩 메시지') }` → `catch (err) { toast.error(err instanceof Error ? err.message : '폴백') }`
- 수정 파일:
  - `src/app/(admin)/attendance/leave/page.tsx` — handleApprove, handleReject
  - `src/components/leave/LeaveAdjustmentModal.tsx` — handleSubmit
  - `src/app/(admin)/attendance/leave/accruals/page.tsx` — handleGenerate
  - `src/app/(admin)/payroll/run/page.tsx` — handleCalculate (catch 블록 신규 추가)

**2. UseCase 영어 ValidationError 메시지 → 한국어 전환 (14개 UseCase, 20개 메시지)**
- 급여: CalculatePayroll, ConfirmPayroll, CancelPayroll, SkipEmployeePayroll, UpdatePayrollItem, GetPayrollLedger
- 근태: ConfirmAttendance, RecordAttendance
- 휴가: ApproveLeaveRequest, RejectLeaveRequest
- 직원: CreateEmployee

**3. EntityNotFoundError 엔티티명 한국어 매핑**
- `src/domain/errors/EntityNotFoundError.ts`에 nameMap 추가 (9개 엔티티)
- `"Employee not found: xxx"` → `"직원을(를) 찾을 수 없습니다. (ID: xxx)"`

### 수정 파일 (영향 범위)

| 레이어 | 파일 | 변경 |
|--------|------|------|
| Domain | `src/domain/errors/EntityNotFoundError.ts` | 엔티티명 한국어 매핑 (9개) |
| UseCase | `src/application/use-cases/payroll/*.ts` (6파일) | ValidationError 메시지 한국어 |
| UseCase | `src/application/use-cases/attendance/*.ts` (2파일) | ValidationError 메시지 한국어 |
| UseCase | `src/application/use-cases/leave/*.ts` (2파일) | ValidationError 메시지 한국어 |
| UseCase | `src/application/use-cases/employees/CreateEmployeeUseCase.ts` | ValidationError 메시지 한국어 |
| UI | `src/app/(admin)/attendance/leave/page.tsx` | catch 블록 에러 메시지 표시 |
| UI | `src/app/(admin)/attendance/leave/accruals/page.tsx` | catch 블록 에러 메시지 표시 |
| UI | `src/app/(admin)/payroll/run/page.tsx` | handleCalculate catch 블록 추가 |
| UI | `src/components/leave/LeaveAdjustmentModal.tsx` | catch 블록 에러 메시지 표시 |

### 검증

- `tsc --noEmit`: ✓ 타입 에러 없음
- `vitest run`: ✓ 20파일 384개 테스트 전부 통과

### 교훈 / 주의사항

1. **catch 블록에서 에러 메시지를 반드시 활용**: `catch { toast.error('하드코딩') }` 패턴 금지. `LeaveGrantModal`이 이미 올바른 패턴(`err instanceof Error ? err.message`)을 사용 중이었으나 나머지에 적용되지 않았음.
2. **UseCase 에러 메시지는 한국어로 작성**: 사용자에게 직접 노출될 수 있으므로 API → 프론트엔드 토스트까지 전달되는 경로를 고려.
3. **handleCalculate 등 비동기 함수에 catch 블록 필수**: catch 없으면 Next.js 에러 오버레이가 페이지를 덮어씀.

---

## [2026-03-21] 휴가 관리 직원 이름 누락 + 대시보드 todo 링크 404 수정

### 배경 (왜)

두 가지 별개 버그 발견:
1. 휴가 관리 "대기" 탭에서 직원 이름이 빈 셀로 표시됨
2. 대시보드 "휴가 승인 대기" 클릭 시 404 에러

### 변경 내용 (무엇을)

**1. 휴가 요청 API 응답 평탄화 (`/api/leave/requests`)**
- Repository는 nested 구조 반환: `{ user: { name, employeeNumber, department: { name } } }`
- 프론트엔드는 flat 필드 기대: `{ userName, employeeNumber, departmentName }`
- API Route에서 `items.map()`으로 평탄화 추가

**2. 대시보드 todos API 링크 경로 수정 (`/api/dashboard/todos`)**
- `(admin)` 디렉토리는 Next.js route group으로 URL에 포함되지 않음
- 5개 link 경로에서 `/admin` 접두사 제거:
  - `/admin/attendance/leave` → `/attendance/leave`
  - `/admin/attendance/monthly` → `/attendance/monthly`
  - `/admin/payroll` → `/payroll`
  - `/admin/attendance/52hour` → `/attendance/52hour`
  - `/admin/dashboard` → `/dashboard`

### 수정 파일 (영향 범위)

| 레이어 | 파일 | 변경 |
|--------|------|------|
| API | `src/app/api/leave/requests/route.ts` | items 평탄화 (userName, employeeNumber, departmentName) |
| API | `src/app/api/dashboard/todos/route.ts` | link 경로 5개에서 `/admin` 접두사 제거 |

### 검증

- `tsc --noEmit`: ✓ 타입 에러 없음
- Playwright MCP: 대시보드 "휴가 승인 대기" 클릭 → `/attendance/leave` 정상 이동 + 직원 이름 "김영수" 표시 확인

### 교훈 / 주의사항

1. **Route group `(parenthesized)` 디렉토리는 URL에 미포함**: `src/app/(admin)/attendance/leave/` → URL은 `/attendance/leave`. API 응답의 link 경로에 route group 이름을 절대 넣지 말 것.
2. **API 응답과 프론트엔드 기대 구조 일치 확인**: Repository가 nested 객체를 반환해도 프론트엔드 훅/타입이 flat 필드를 기대하면 API에서 평탄화해야 함. 새 API 작성 시 프론트엔드 타입(`useXxx.ts`)과 대조 필수.

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

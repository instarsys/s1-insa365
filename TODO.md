# TODO — s1-insa365 작업 백로그

> 모든 작업 추적은 이 파일 하나에서 관리합니다.
> 최종 업데이트: 2026-03-14 (일별 근태 보기 404 수정 + GlobalSearch dead link 정리)

---

## 0. MVP 출시 전 필수 (Go/No-Go + 배포)

### Go/No-Go 검증 체크리스트 (수동)
- [x] 급여 E2E 통합 테스트 49건 전체 PASS (근태→휴가→급여계산→대장/명세서 전체 흐름)
- [ ] 급여 계산 정확도 99%+ (직원 3명 수동 검산 대비)
- [ ] 셀프 온보딩 3분 이내 (회원가입 → 시드 → 첫 급여 시뮬)
- [ ] 50명 급여 일괄 계산 10초 이내 (DB 기동 후 측정)
- [ ] 4대보험 4종 + 소득세 2종 자동계산 정상
- [ ] 52시간 초과 감지 + 경고 작동
- [ ] PII 암호화 동작, RBAC 접근 차단 확인

### 배포 설정
- [ ] 환경변수 정리 (`.env.production`)
- [ ] Docker build 확인
- [ ] Sentry DSN 설정

---

## 0-1. 다음 우선 작업 (AttendanceClassifier 후속)

> 근태 판정 시스템 구현 완료 후 연동 검증 + E2E 수정이 필요한 항목

| # | 항목 | 설명 | 상태 |
|---|------|------|------|
| 0-1-1 | E2E 테스트 영향 점검 + 수정 | **수정 불필요** — 분석 완료. ① status: E2E가 모두 명시적 전달 → autoStatus 무시. ② minutes: 자동 계산으로 더 정확해짐 (기대값 방향 일치). ③ assertion: 모든 검증이 느슨한 비교 (>0, 숫자패턴). 유일한 exact match(기본급 4,500,000)는 EmployeeSalaryItem 기반이라 minutes 무관 | ✅ |
| 0-1-2 | dev 서버 수동 연동 검증 | Playwright MCP로 검증 완료: 지각30분+조퇴120분→근태확정→급여계산→공제 2,541,024원 (결근19일+지각/조퇴150분) 정확 일치 | ✅ |
| 0-1-3 | Seed 데이터에 WorkPolicy 배정 확인 | 코드 분석 완료 — 53명 모두 workPolicyId 배정, fallback도 존재 | ✅ |
| 0-1-4 | 결근 공제 급여 검증 | 단위 테스트 3건 추가 (결근 공제/0일/시급제). GrossPayCalculator 검증 완료 | ✅ |
| 0-1-5 | 지각/조퇴 minutes 합산 확인 | DB 컬럼 4개 추가 + API 3개 수정 + GrossPayCalculator 공제 로직 + 단위 테스트 4건. 마이그레이션 `20260217103011` | ✅ |

---

## 1. 시프티 벤치마크 2차 (5개 영역)

> 시프티 실접속 스크린샷 12장 분석 기반

| # | 항목 | 난이도 | 상태 |
|---|------|--------|------|
| 1-1 | 회원가입 개선 (소셜버튼+약관+인원수) | ★★ | ✅ |
| 1-2 | 대시보드 5위젯 (누락/공지/관리/리포트/휴가) | ★★★ | ✅ |
| 1-3 | 직원추가 합류초대 (코드발송+가입) | ★★★ | ✅ |
| 1-4 | 엑셀 업/다운로드 (3종 업로드+내보내기) | ★★★★ | ✅ |
| 1-5 | 결제 카드 등록 (토스페이먼츠+플랜) | ★★★★★ | ✅ |

### 1차 시프티 GAP (남은 항목)
| # | 항목 | 우선순위 | 설명 | 상태 |
|---|------|---------|------|------|
| 1-6 | 지점별 색상 바 | Medium | 달력형 셀 좌측에 부서/지점별 고유 컬러 | |
| 1-7 | 컬럼별 검색 필터 | Medium | 목록형 테이블 각 헤더 아래 인풋 | |
| 1-8 | 출퇴근 장소 GPS 반경 설정 UI | Medium | GPS 반경(26~100m) + WiFi 인증 | |
| 1-9 | GPS 장소명 표시 | Low | 좌표 대신 WorkLocation 이름 표시 | |
| 1-10 | 비활성화 토글 | Low | 직원/부서/지점 "비활성화된 항목 보기" | |

---

## 2. Phase 1.5 — 법적 필수 + GTM + 급여 UX 확장 (MVP 이후 ~2개월)

| # | 항목 | 설명 |
|---|------|------|
| 2-1 | 퇴직금 계산/시뮬레이션 | 법적 의무, MVP 플로우와 분리 |
| 2-2 | 퇴직소득세 계산 | 퇴직금 연계 |
| 2-3 | PDF 급여명세서 | 웹 조회로 법적 충족 중, PDF는 부가가치 |
| 2-4 | 카카오 알림톡 급여명세서 발송 | 발송 채널 확대 |
| 2-5 | PWA 푸시 알림 | 인앱 알림 → 브라우저 푸시 확장 |
| 2-6 | 세무사용 데이터 Export (WEHAGO 호환) | GTM 핵심 |
| 2-7 | 세무사 대시보드 (수임회사 급여 현황) | 세무사 파트너 프로그램 기반 |
| 2-8 | 간이지급명세서 데이터 생성 | 법적 신고용 |
| 2-9 | 비정기 급여 (Off-Cycle Payroll) | 상여금/인센티브/정정 |
| 2-10 | AutoPilot (급여 자동 실행) | 월급직 자동 DRAFT → 1-click 확정 |
| 2-11 | CSV Import (급여 데이터) | 외부 근태 시스템 연동 |
| 2-12 | 커스텀 리포트 | 컬럼 선택, 복합 필터, 템플릿, 스케줄 |
| 2-13 | BullMQ 비동기 배치 | 300명+ 급여 일괄 계산 (현재 동기) |
| 2-14 | Excel/CSV Import/Export | 직원 일괄 등록 + 데이터 내보내기 |
| 2-15 | `getPrismaForTenant` 전환 | RLS + app-level guard에서 점진적 이관 |
| 2-16 | 휴가 자동 발생 배치 (BullMQ) | LeaveAccrualRule 기반 자동 부여 (규칙은 구현 완료) |
| 2-17 | 결제 시스템 | Stripe/토스페이먼츠 연동 |

---

## 3. Phase 2 — 확장 기능 (MVP 이후 ~3개월)

| # | 항목 | 설명 |
|---|------|------|
| 3-1 | 연말정산 | 연차 자동계산 고급 (대리승인, 자동승인 규칙) |
| 3-2 | 증명서 발급 | 재직, 경력, 소득 증명서 |
| 3-3 | 급여명세서 이메일 발송 | PDF + 이메일 채널 |
| 3-4 | 외출 관리 | 근태 부가 기능 |
| 3-5 | 4대보험 EDI 연동 | 전자 신고 |
| 3-6 | PWA 오프라인 (Service Worker) | 오프라인 출퇴근 → 복귀 시 동기화 |
| 3-7 | 직원 프로필 사진 | 부가 기능 |
| 3-8 | 부양가족 수 직원 수정 | 세금 영향, 관리자 승인 필요 |

---

## 4. Phase 3 — 성장 가속 (Phase 2 이후 ~6개월)

| # | 항목 | 설명 |
|---|------|------|
| 4-1 | AI 기반 급여 이상 감지 | 자동 이상치 탐지 |
| 4-2 | Open API 플랫폼 | 외부 연동 |
| 4-3 | 네이티브 모바일 앱 | PWA → React Native |
| 4-4 | 전자계약/전자서명 | 근로계약서 |
| 4-5 | 사내 공지/커뮤니케이션 | HR 부가 기능 |
| 4-6 | 다국어 지원 | 영어 등 |

---

## 완료 이력

| 날짜 | 항목 |
|------|------|
| 2026-02-08 | Sprint 1-6 전체 구현 (Seed, Payroll E2E, GPS, Super Admin, PWA, Zod, Rate Limiting) |
| 2026-02-08 | Gusto UI/UX 벤치마크 (대시보드, 직원목록, 직원상세, 급여Step3, 글로벌검색) |
| 2026-02-08 | Super Admin 콘솔 분리 (6페이지 + 별도 레이아웃/로그인) |
| 2026-02-09 | E2E 563 테스트 전체 PASS (27 spec + 3 setup) |
| 2026-02-09 | 시프티 벤치마크 MVP 적용 (미퇴근 빨간●, 페이지네이션, 휴가토글, 요약바) |
| 2026-02-10 | 휴가 관리 시스템 (DB 5모델 + API 12개 + 페이지 4개 + 도메인 서비스 30 tests) |
| 2026-02-10 | 클린 아키텍처 전환 (79/80 API → DI 컨테이너, 104 files, 커밋 `c28fa9a`) |
| 2026-02-10 | CLAUDE.md 구조 개선 (CA 최상단, Project Status 삭제, 커밋 `ccb15ff`) |
| 2026-02-10 | 문서 통합 업데이트 (PRD v2.10, MVP v2.10, Sprint Plan v1.5, shiftee-benchmark) |
| 2026-02-10 | 시프티 벤치마크 2차 (회원가입/대시보드위젯/합류초대/엑셀업다운/결제) — 커밋 `370e8f7` |
| 2026-02-10 | 휴가 관리 메뉴 독립 분리 (사이드바에서 근태 하위 → 최상위 CalendarDays 아이콘) |
| 2026-02-10 | 급여 E2E 통합 테스트 49건 (`e2e/payroll-integration.spec.ts`) — 7 Phase 전체 워크플로우 |
| 2026-02-10 | 프로덕션 버그 4건 수정: 급여대장 API 포맷, 스프레드시트 items, Decimal 문자열 연결, deleteByPeriod hard delete |
| 2026-02-14 | 직원별 개별 급여 정보 입력 시스템 (6 Parts 전체 완료) |
| 2026-02-14 | ├ DB: SalaryType enum (MONTHLY/HOURLY) + User.salaryType, hourlyRate 컬럼 추가 |
| 2026-02-14 | ├ 도메인: OrdinaryWageCalculator, GrossPayCalculator, PayrollCalculator 시급제 분기 |
| 2026-02-14 | ├ UI: 직원 상세 급여 탭 인라인 편집 (FIXED/VARIABLE 금액, FORMULA 잠금, 합계 요약 바) |
| 2026-02-14 | ├ API: 직원 생성 시 baseSalary→A01 반영 + salaryType/hourlyRate 저장, Zod 스키마 확장 |
| 2026-02-14 | ├ Seed: 50→53명 (시급제 3명 추가: 홍파트/이알바/박시급) |
| 2026-02-14 | └ 테스트: 191→198 (시급제 단위 테스트 7건 추가), tsc clean |
| 2026-02-16 | 임시비밀번호 강제변경 + 합류초대 개선 + withAuth 방어적 에러 처리 |
| 2026-02-16 | ├ DB: `mustChangePassword` Boolean 컬럼 추가 (마이그레이션 `20260216043136`) |
| 2026-02-16 | ├ 비밀번호 변경: `/change-password` 페이지 + `/api/auth/change-password` API (Zod+감사로그) |
| 2026-02-16 | ├ PasswordChangeGuard: admin/employee 레이아웃에서 mustChangePassword 시 강제 리다이렉트 |
| 2026-02-16 | ├ 로그인 플로우: mustChangePassword=true → `/change-password`로 분기 |
| 2026-02-16 | ├ 합류초대 개선: `/api/auth/join`에서 임시비밀번호 발급 + 급여항목 복사 + mustChangePassword=true |
| 2026-02-16 | ├ 직원 생성 개선: `/api/employees` POST에서 임시비밀번호 생성 + mustChangePassword=true |
| 2026-02-16 | ├ withAuth 래퍼: try-catch 추가 → API 예외 시 JSON 에러 응답 + 서버 콘솔 로그 (빈 body 500 방지) |
| 2026-02-16 | └ 버그 수정: auth/me 500 에러 → 사이드바 미표시 (Prisma Client 재생성으로 해결) |
| 2026-02-16 | AttendanceClassifier 근태 판정 + FormulaEngine 수식 엔진 + 급여 연동 — 커밋 `5c7043a` |
| 2026-02-16 | ├ **AttendanceClassifier**: 근무정책 → 근태 → 급여 전체 연동 도메인 서비스 |
| 2026-02-16 | ├ check-in: WorkPolicy 조회 → 지각 판정(grace) + isHoliday 자동 설정 |
| 2026-02-16 | ├ check-out: AttendanceClassifier → 8가지 minutes + AttendanceSegment 생성 |
| 2026-02-16 | ├ manual: checkIn+checkOut 있으면 자동 classify (관리자 status 우선) |
| 2026-02-16 | ├ confirm: 결근 자동 생성 + workDays 소정근로일수 정확 계산 (countWorkDaysInMonth) |
| 2026-02-16 | ├ GrossPayCalculator: 월급제 결근 공제 (basePay / workDays × absentDays) |
| 2026-02-16 | ├ CalculatePayrollUseCase: SalaryAttendanceData → absentDays/workDays 매핑 |
| 2026-02-16 | ├ Repository: replaceSegments(), findApprovedByPeriod() 추가 |
| 2026-02-16 | ├ **FormulaEngine**: 한글 변수 수식 파서 + 급여규칙 isSystemManaged + validate API |
| 2026-02-16 | ├ FormulaEditor/FormulaDisplay/VariablePanel UI 컴포넌트 |
| 2026-02-16 | └ 검증: tsc clean, vitest 313 tests pass (기존 275 + AttendanceClassifier 38 + FormulaEngine 59 중복 포함) |
| 2026-02-17 | 로그인 직후 사이드바 미표시 버그 수정 — 커밋 `c248aeb` |
| 2026-02-17 | ├ **근본 원인**: useAuth()의 `useMemo([], [])` + `window.location.pathname` → 클라이언트 사이드 네비게이션 시 swrKey가 null로 고정 |
| 2026-02-17 | ├ useAuth: `usePathname()` 사용으로 Next.js 라우팅 상태와 동기화 + `globalMutate`로 캐시 주입 |
| 2026-02-17 | 0-1-1 E2E 테스트 영향 점검 완료 — **수정 불필요** (status 명시적 전달, assertion 느슨한 비교, minutes 자동계산은 더 정확한 방향) |
| 2026-02-17 | 0-1-3~5 지각/조퇴 분 단위 저장 + 급여 공제 구현 — 마이그레이션 `20260217103011` |
| 2026-02-17 | ├ DB: Attendance에 lateMinutes/earlyLeaveMinutes, SalaryAttendanceData에 totalLateMinutes/totalEarlyLeaveMinutes 컬럼 추가 |
| 2026-02-17 | ├ API: check-out/manual/confirm 3개 API에 lateMinutes/earlyLeaveMinutes 저장/합산 로직 추가 |
| 2026-02-17 | ├ 도메인: AttendanceSummary 타입 확장, GrossPayCalculator 지각/조퇴 공제 (통상시급×분/60) |
| 2026-02-17 | ├ UseCase: CalculatePayrollUseCase에 totalLateMinutes/totalEarlyLeaveMinutes 매핑 |
| 2026-02-17 | ├ 테스트: GrossPayCalculator 7건 추가 (결근 3건 + 지각/조퇴 4건), 도메인 301 tests pass |
| 2026-02-17 | └ Playwright MCP 검증: 빈나래 지각30분+조퇴120분→결근19일+공제 2,541,024원 = floor(basePay/22)×19 + floor(14593×150/60) 정확 일치 |
| 2026-02-17 | ├ AdminSidebar: `isLoading \|\| !user` 방어적 스켈레톤 표시 |
| 2026-02-17 | ├ change-password/join: `globalMutate('/api/auth/me')` 캐시 무효화 추가 |
| 2026-02-17 | └ Playwright MCP로 로그인→대시보드 사이드바 즉시 표시 검증 완료 |
| 2026-02-17 | 사이드바 접힘/펼침 + 호버 자동펼침 + CSS Grid 부드러운 애니메이션 — 커밋 `58c2cad` |
| 2026-02-17 | ├ SidebarContext: collapsed 상태를 레이아웃 전체에서 공유 (신규) |
| 2026-02-17 | ├ AdminSidebar/SuperAdminSidebar: 접힘(w-16)/펼침(w-60) 토글 + 호버 자동펼침 (200ms 딜레이) |
| 2026-02-17 | ├ 접힌 상태 플로팅 패널: 아이콘 호버 시 하위메뉴 팝업 |
| 2026-02-17 | ├ 하위메뉴 CSS Grid 높이 애니메이션: grid-rows-[0fr] ↔ grid-rows-[1fr] (duration-200) |
| 2026-02-17 | ├ AdminContent/SuperAdminContent: collapsed 상태에 따른 main 영역 마진 조정 (신규) |
| 2026-02-17 | └ Playwright MCP로 펼침/접힘/호버/클릭고정/플로팅패널 전체 검증 완료 |
| 2026-02-18 | 직원별 공제 항목(D01-D12) 시드 + 지급/공제 분리 UI + 토글 활성화 — 커밋 `039fb72` |
| 2026-02-18 | ├ seed.ts: 모든 직원에게 D01-D12 공제 항목 자동 생성 (D01-D06 법정 FORMULA / D07-D12 임의 FIXED) |
| 2026-02-18 | ├ 직원 상세 급여탭: 지급 항목 / 공제 항목 테이블 분리 + 합계 요약 바 (총지급-총공제=예상실수령) |
| 2026-02-18 | ├ 급여 항목 활성/비활성 ToggleSwitch (법정 공제 D01-D06, 기본급은 비활성화 불가 — Lock 아이콘) |
| 2026-02-18 | ├ PATCH /api/employees/[id]/salary-items: toggleActive API + 감사 로그 + 서버측 법정공제/기본급 검증 |
| 2026-02-18 | ├ EmployeeSalaryItemRepository.toggleActive() 메서드 추가 (companyId 테넌트 검증 포함) |
| 2026-02-18 | ├ apiPatch 유틸 (src/lib/api.ts) + toggleSalaryItemActive 훅 (useEmployees.ts) 추가 |
| 2026-02-18 | └ DB 리셋 + 시드 재실행으로 기존 직원에도 D01-D12 전체 반영 확인 |
| 2026-02-18 | 급여규칙 ↔ 직원 급여항목 자동 동기화 — 커밋 `3fb0751` |
| 2026-02-18 | ├ salary-rules POST: 규칙 생성 후 활성 직원 전원에게 EmployeeSalaryItem 자동 전파 (멱등, isSystemManaged→활성) |
| 2026-02-18 | ├ salary-rules PUT: formula 변경 시 updateFormulaByCode()로 전 직원 항목에 수식 일괄 전파 |
| 2026-02-18 | ├ EmployeeSalaryItemRepository: findByCodes(), updateFormulaByCode() 메서드 추가 |
| 2026-02-18 | └ Playwright 검증: A12 특별수당 생성→56명 전파 확인, 수식 변경→56명 일괄 반영, 콘솔 에러 0건 |
| 2026-02-18 | 공제 항목 법정/임의 분리 UI + 에러 토스트 서버 메시지 표시 — 커밋 `bce9546` |
| 2026-02-18 | ├ 공제 항목 테이블: 법정 공제(D01-D06)를 접기/펼치기 가능한 요약행으로 분리, ChevronDown 아이콘 토글 |
| 2026-02-18 | ├ 임의 공제(D07-D12): 항상 표시, ToggleSwitch로 활성화/비활성화 가능 |
| 2026-02-18 | ├ 에러 토스트 개선: 직원 상세 페이지 5개 catch 블록에서 서버 에러 메시지(err.message)를 토스트에 포함 |
| 2026-02-18 | ├ seed.ts 리팩토링: 하드코딩 D01-D12 → SalaryRule 기반 동적 복사 (CreateEmployeeUseCase와 동일 패턴) |
| 2026-02-18 | └ 4대보험 설정 저장 Playwright 검증: 미가입/수동입력/자동계산 3회 왕복 테스트 + 새로고침 후 값 유지 확인 |
| 2026-02-19 | 직원 상태 전이 (휴직/복귀/퇴직/퇴직취소/재입사) — 전체 구현 + Playwright MCP E2E 검증 |
| 2026-02-19 | ├ DB: User에 leaveStartDate, leaveReason, resignDate, resignReason 컬럼 추가 (마이그레이션 `20260218133509`) |
| 2026-02-19 | ├ UseCase 3개 신규: StartLeaveUseCase, ReturnFromLeaveUseCase, RehireEmployeeUseCase |
| 2026-02-19 | ├ UseCase 수정: TerminateEmployeeUseCase (퇴사일/사유 저장 + 퇴직취소 지원) |
| 2026-02-19 | ├ API 3개 신규: POST/DELETE /employees/[id]/leave (휴직/복귀), POST /employees/[id]/rehire (재입사) |
| 2026-02-19 | ├ API 수정: PATCH /employees/[id] (퇴직처리 + 퇴직취소) |
| 2026-02-19 | ├ UI: StatusBadgeDropdown 컴포넌트 (상태별 드롭다운 + 모달) + DropdownMenu 컴포넌트 |
| 2026-02-19 | ├ 직원 목록: 상태 필터 탭 (재직/휴직/퇴직) + 상태별 카운트 |
| 2026-02-19 | ├ 직원 상세: 인사 정보에 휴직시작일/사유, 퇴사일/사유 동적 표시 |
| 2026-02-19 | └ Playwright MCP E2E 5개 시나리오 전체 통과: ACTIVE↔ON_LEAVE, ACTIVE→RESIGNED, 퇴직취소, 재입사 |
| 2026-03-14 | 일별 근태 보기 404 수정 + GlobalSearch dead link 정리 |
| 2026-03-14 | ├ 직원 상세 근태 탭: "일별 근태 보기" → "근태 기록 보기", `/attendance/daily` → `/attendance/records?search=직원이름` |
| 2026-03-14 | ├ attendance/records: URL `?search=` 파라미터에서 검색 초기값 읽기 |
| 2026-03-14 | ├ GlobalSearch: "일별 근태"→"근태 목록" (`/attendance/records`), "월별 현황"→"근태 달력" (`/attendance/calendar`) |
| 2026-03-14 | └ 빈 디렉토리 `src/app/(admin)/attendance/daily/` 삭제 |

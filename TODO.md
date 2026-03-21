# TODO — s1-insa365 작업 백로그

> 모든 작업 추적은 이 파일 하나에서 관리합니다.
> 최종 업데이트: 2026-03-22 (사업자번호 검증 + 배치 근태 추가 + 급여규칙 수정 + 휴가 관리 개선)

---

## 0. MVP 출시 전 필수 (Go/No-Go + 배포)

### Go/No-Go 검증 체크리스트
- [x] 급여 E2E 통합 테스트 49건 전체 PASS (근태→휴가→급여계산→대장/명세서 전체 흐름)
- [x] 급여 계산 정확도 99%+ — PayrollAccuracyVerification 3시나리오 통과 (월급고소득/월급중간+OT/시급), IEEE 754 1원 오차만 (2026-03-16 코드 감사)
- [ ] 셀프 온보딩 3분 이내 (회원가입 → 시드 → 첫 급여 시뮬) — 인프라 준비 완료, 수동 UX 테스트 필요
- [ ] 50명 급여 일괄 계산 10초 이내 — `scripts/benchmark-payroll.mjs` 존재, DB 기동 후 실행 필요
- [x] 4대보험 4종 + 소득세 2종 자동계산 정상 — 국민연금/건강/장기요양/고용보험 공식 CLAUDE.md 100% 일치, 간이세액표 시드 완비 (dep 1~3) (2026-03-16 코드 감사)
- [x] 52시간 초과 감지 + 경고 작동 — API(`/api/attendance/52hour`) + UI(overtime 페이지) + hook 완성, ISO week 그룹핑/48h경고/52h초과 (2026-03-16 코드 감사)
- [x] PII 암호화 동작, RBAC 접근 차단 확인 — AES-256-GCM + canViewSensitive + 감사로그 + EncryptionService 단위 테스트 13개 추가 (2026-03-16 코드 감사)
- [x] 단위 테스트 399개 전체 PASS (vitest, 21파일 1.6초) — BusinessNumber 15개 + 테넌트 격리 33개 + EncryptionService 13개 포함 (2026-03-22)

### 배포 설정 (인프라 파일 준비 완료, 실제 값 입력 필요)
- [ ] 환경변수 정리 (`.env.production`) — `.env.production.example` 템플릿 존재, 실제 값 입력 필요
- [ ] Docker build 확인 — `Dockerfile` 3-stage + `docker-entrypoint.sh` + `docker-compose.prod.yml` 존재
- [ ] Sentry DSN 설정 — `sentry.server.config.ts` + `sentry.client.config.ts` 존재 (SSN 마스킹 포함)

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
| 2-15 | `getPrismaForTenant` 전환 | RLS + app-level guard에서 점진적 이관 (현재 `withTenantAuth` 미들웨어 준비 완료) |
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
| 2026-03-15 | WorkPolicy로 급여/근태 설정 이동 (Company → WorkPolicy) — 6필드 이전 + DB 마이그레이션 `20260315100000` |
| 2026-03-16 | 급여 항목 동기화 + 직원 등록 폼 개선 + 시드 PII 데이터 — 커밋 `6fd629e` |
| 2026-03-16 | ├ POST /api/employees/[id]/salary-items: 활성 SalaryRule 중 누락분만 생성 (code 기준 멱등) |
| 2026-03-16 | ├ syncSalaryItems 훅 + EmptyState UI에 "급여 규칙에서 항목 가져오기" 버튼 |
| 2026-03-16 | ├ 직원 등록 폼: 기본정보(이름/주민번호/연락처) → 인사정보 → 급여정보 순서 재구성 |
| 2026-03-16 | ├ 주민등록번호 필수 검증 (13~14자) + 직원 등록 후 급여탭으로 자동 이동 |
| 2026-03-16 | └ 시드 직원 5명에 PII 데이터(전화번호/주소/은행/주민번호) 추가 + AES-256-GCM 암호화 |
| 2026-03-16 | **Go/No-Go 코드 감사 + 테스트 보강** — 커밋 `4e646d2`, `0df2edc`, `440f232` |
| 2026-03-16 | ├ 입사유형 CONTRACT(계약직) 추가 (constants.ts + employee schema) |
| 2026-03-16 | ├ vitest 설정 수정: e2e/Playwright 파일 제외 (include/exclude 명시) → 17파일 341테스트 클린 통과 |
| 2026-03-16 | ├ **EncryptionService 단위 테스트 13개 추가**: 암복호화 라운드트립, IV 랜덤성, authTag/ciphertext 변조 감지, 키 검증 |
| 2026-03-16 | ├ 급여 계산 엔진 전체 감사: Phase 0~5, 보험료/세금 공식 CLAUDE.md 100% 일치 확인 |
| 2026-03-16 | ├ 52시간 초과 감지 코드 감사: API + UI + hook 완성 확인 |
| 2026-03-16 | ├ PII 보안 코드 감사: AES-256-GCM + canViewSensitive + 감사로그 확인 |
| 2026-03-16 | └ 배포 설정 감사: Dockerfile + docker-compose.prod + .env.production.example + Sentry 전부 존재 확인 |
| 2026-03-18 | **테넌트 격리(companyId) 3중 방어 체계 완성** |
| 2026-03-18 | ├ **P0 CRITICAL 5건**: SalaryCalculation/Payment/Invitation/Announcement/UserAuth에 companyId 가드 추가 |
| 2026-03-18 | ├ auth/refresh: JWT companyId ↔ DB companyId 교차 검증 (토큰 조작 방어) |
| 2026-03-18 | ├ CompanyHolidayRepository.delete(): `delete({id})` → `deleteMany({id, companyId})` 이중 안전 |
| 2026-03-18 | ├ **P1 구조적 개선 4건**: company_holidays RLS + FORCE RLS 17테이블 + withTenantAuth 미들웨어 + setTenantContext UUID 검증 |
| 2026-03-18 | ├ DB 마이그레이션: `20260318100000_tenant_isolation_hardening` (company_holidays RLS + FORCE RLS 17테이블) |
| 2026-03-18 | ├ withTenantAuth 미들웨어 신규: withAuth + RLS 세션 변수 설정 결합 (점진 적용 대기) |
| 2026-03-18 | ├ tenant-extension: TENANT_MODELS에 CompanyHoliday 추가 (17개), setTenantContext UUID 형식 검증 |
| 2026-03-18 | ├ DI 컨테이너: setTenantContext(companyId) 함수 export 추가 |
| 2026-03-18 | └ 테넌트 격리 단위 테스트: 19개 → **33개** (P0 14개 + CompanyHoliday 2개 추가), vitest 373개 전체 통과 |
| 2026-03-18 | **근태면제(attendanceExempt) 기능 구현 + 시급제+근태면제 동시 설정 방어** |
| 2026-03-18 | ├ DB: User에 `attendance_exempt` Boolean 컬럼 추가 (마이그레이션 `20260317164902`) |
| 2026-03-18 | ├ 직원 등록/수정 API: `attendanceExempt` 필드 지원 + Zod refine (HOURLY+면제 동시 금지) |
| 2026-03-18 | ├ 직원 수정 PUT: DB 기존값 포함 effective 검증 + 시급제 변경 시 근태면제 자동 해제 |
| 2026-03-18 | ├ CheckIn/CheckOutUseCase: 근태면제 직원 출퇴근 차단 |
| 2026-03-18 | ├ CalculatePayrollUseCase: 근태면제 직원은 근태 미확정이어도 기본급+고정수당 지급 (SKIPPED 아님) |
| 2026-03-18 | ├ 직원앱 홈/근태 페이지: 근태면제 직원에게 면제 안내 카드 표시 (출퇴근 버튼 숨김) |
| 2026-03-18 | ├ 관리자 직원 상세: 기본정보 탭에 근태면제 토글 (시급제 시 비활성) + 급여 탭 save 시 동기화 |
| 2026-03-18 | ├ 관리자 직원 등록: 근태면제 토글 추가 + 시급제 변경 시 자동 OFF |
| 2026-03-18 | ├ 근태 달력: 면제 직원에 "면제" 뱃지 표시 |
| 2026-03-18 | ├ useAuth/useEmployees/useAttendance 훅: attendanceExempt 필드 추가 |
| 2026-03-18 | └ 직원 상세 근태면제 안내 문구 UI 개선: plain text → styled info box (gray/amber) + 읽기 전용에서도 항상 표시 |
| 2026-03-19 | **근태 확정 취소 + 급여 연쇄 취소 + 확정 근태 보호** |
| 2026-03-19 | ├ **POST /api/attendance/cancel** (신규): 급여 CONFIRMED/PAID 차단 + 확정 해제 + 자동 결근 삭제 + 스냅샷 삭제 + 감사 로그 |
| 2026-03-19 | ├ AttendanceRepository: `unconfirmByDateRange()`, `deleteAutoAbsentByDateRange()` 메서드 추가 |
| 2026-03-19 | ├ SalaryAttendanceDataRepository: `deleteByPeriod()` 메서드 추가 |
| 2026-03-19 | ├ useAttendance 훅: `cancelConfirmAttendance()` 함수 추가 |
| 2026-03-19 | ├ AttendanceConfirmBar UI: 급여 상태 SWR 연동 + 연쇄 취소(급여→근태) + PAID 취소 불가 + 급여 확정/지급완료 뱃지 |
| 2026-03-19 | ├ AttendanceRecordModal: 확정 근태 읽기 전용 모드 (수정/삭제 불가 + 안내 배너) |
| 2026-03-19 | ├ attendance/[id] API: 확정된 근태 삭제 차단 |
| 2026-03-19 | ├ attendance/manual API: 확정된 근태 수정 차단 |
| 2026-03-19 | ├ attendance/confirm API: 타임존 안전 날짜 처리(toDateStr) + 근태면제 직원 all-zero 스냅샷 + 에러 로깅 |
| 2026-03-19 | ├ AttendanceRepository: 5개 메서드 UTC 날짜 범위 수정 (findMonthly/confirmByPeriod/findAllByMonth/findForCalendar×2) |
| 2026-03-19 | ├ usePayroll 훅: PayrollSummary에 status 필드 추가 + mutate 반환 |
| 2026-03-19 | └ e2e/attendance-confirm.spec.ts: 근태 확정/취소 E2E 테스트 추가 |
| 2026-03-21 | **휴가 관리 직원 이름 누락 + 대시보드 todo 링크 404 수정** |
| 2026-03-21 | ├ `/api/leave/requests` 응답 평탄화: `userName`, `employeeNumber`, `departmentName` 필드 추가 (nested user → flat) |
| 2026-03-21 | └ `/api/dashboard/todos` link 경로 5개에서 `/admin` 접두사 제거 — `(admin)` route group은 URL에 미포함 |
| 2026-03-21 | **에러 메시지 한국어 전환 + 프론트엔드 에러 핸들링 개선** |
| 2026-03-21 | ├ 프론트엔드 catch 블록 5곳: 서버 에러 메시지를 토스트로 표시 (기존: 하드코딩 메시지만 표시) |
| 2026-03-21 | ├ 급여 실행 `handleCalculate`에 catch 블록 추가 (기존: catch 없어 런타임 에러 페이지 노출) |
| 2026-03-21 | ├ UseCase 영어 ValidationError 메시지 → 한국어 전환 (14개 UseCase, 20개 메시지) |
| 2026-03-21 | └ `EntityNotFoundError` 엔티티명 한국어 매핑 (9개 엔티티: 직원/급여 계산/급여 규칙/휴가 신청 등) |
| 2026-03-22 | **사업자번호 유효성 검증 + 회원가입/설정 보호** |
| 2026-03-22 | ├ BusinessNumber 값 객체: 국세청 체크섬 알고리즘 + 자동 하이픈 포맷팅 (단위 테스트 15개) |
| 2026-03-22 | ├ 회원가입: Zod refine 검증 + 중복 사업자번호 체크 (DB unique 제약 + 마이그레이션) |
| 2026-03-22 | ├ 설정 페이지: 상호/사업자번호 readOnly 처리 (API allowedFields 제거) |
| 2026-03-22 | └ 소셜 로그인 버튼 숨김 (미구현 기능), 테스트 데이터 초기화 스크립트 추가 |
| 2026-03-22 | **클린 아키텍처 감사 + 위반 수정** |
| 2026-03-22 | ├ 전체 프로젝트 CA 감사: 121 API Route 100%, Domain/Application 레이어 99% 준수 |
| 2026-03-22 | └ GrantLeaveUseCase Prisma 타입 의존 제거 → Domain LeaveType 분리 (CA 100% 달성) |
| 2026-03-22 | **출퇴근 기록 복수 날짜 일괄 추가** |
| 2026-03-22 | ├ BatchManualAttendanceUseCase: 시작일~종료일 범위 + 주말/공휴일 제외 + 트랜잭션 일괄 생성 |
| 2026-03-22 | ├ POST /api/attendance/manual/batch: 배치 API (CA 준수) |
| 2026-03-22 | ├ 모달 UI: 시작일+종료일, ☑주말제외/☑공휴일제외, "N일분 생성 예정" 프리뷰 |
| 2026-03-22 | ├ 기존 기록 덮어쓰기 방지 + 저장 전 확인창 + 출근 09:00/퇴근 18:00 기본값 |
| 2026-03-22 | └ soft-delete + unique 충돌 수정 (단일/배치 모두) |
| 2026-03-22 | **급여규칙 버그 수정 3건** |
| 2026-03-22 | ├ PaymentCycle YEARLY → ANNUAL enum 불일치 수정 |
| 2026-03-22 | ├ soft-delete + unique 충돌 방지 (삭제 후 동일 코드 재생성 가능) |
| 2026-03-22 | ├ sortOrder 누락 수정 (API body에서 미추출) |
| 2026-03-22 | ├ A01 기본급 수당 탭에 표시 + Lock 보호 (BASE 타입 필터 누락 수정) |
| 2026-03-22 | ├ 급여규칙 동기화 시 삭제된 규칙 항목 soft-delete 처리 |
| 2026-03-22 | └ 시급제 직원: 통상시급(자동) 숨김 + A01 기본급 "(시급제는 시급으로 계산)" 안내 |
| 2026-03-22 | **휴가 관리 개선** |
| 2026-03-22 | ├ 휴가 목록 빈 필드 수정 (API 응답 평탄화: userName/departmentName/leaveTypeName) |
| 2026-03-22 | ├ 휴가 부여 후 자동으로 목록 탭 이동 + history 데이터 갱신 |
| 2026-03-22 | ├ 휴가 수정/삭제 기능 (PUT/DELETE API + 목록 액션 버튼 + 수정 모달) |
| 2026-03-22 | ├ APPROVED 삭제 시 잔여일수 자동 복원 (deductsFromBalance 체크) |
| 2026-03-22 | ├ 수정 모달: 직원/부서/유형 읽기전용 표시 + 일수 안내 문구 |
| 2026-03-22 | ├ 승인 휴가 달력 표시: API에서 LeaveRequest 조회 → 보라색 "휴가(유형명)" 오버레이 |
| 2026-03-22 | ├ 근태 확정 시 승인 휴가일에 Attendance.status='LEAVE' 자동 생성 |
| 2026-03-22 | └ 달력 휴가 셀 클릭 시 출퇴근 추가 모달 방지 → 안내 토스트 표시 |

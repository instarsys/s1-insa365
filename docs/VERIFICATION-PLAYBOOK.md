# s1-insa365 구현 검증 플레이북

> 최종 업데이트: 2026-04-18
> 목적: Claude Code와 Codex를 함께 사용할 때 구현, 리뷰, 회귀 검증 순서를 고정하기 위한 운영 문서

## 1. 기본 역할 분담

- Claude Code
  - 기능 구현 주도
  - UI 변경, API 추가, 스키마 변경, 테스트 작성
- Codex
  - 구조 파악
  - 계약 검증
  - 레이어 위반 탐지
  - 타입/테스트/회귀 리뷰

이 분담은 기본값이다. 작업 특성상 Codex가 직접 구현할 수 있지만, 리뷰 기준은 동일하게 유지한다.

## 2. 기본 검증 순서

모든 변경은 아래 순서로 확인한다.

1. 계약 확인
   - 프론트가 기대하는 DTO와 API 응답 shape가 같은지 확인
   - 새 쿼리 파라미터, enum, 상태값이 기존 UI 흐름과 충돌하지 않는지 확인
2. 레이어 위반 탐지
   - API Route에서 `prisma` 직접 접근 여부 확인
   - `getContainer()` 우회 여부 확인
   - Domain에 프레임워크/인프라 의존성이 섞였는지 확인
3. 타입과 테스트
   - `npm run type-check`
   - `npm run test`
4. 회귀 포인트 리뷰
   - 관련 E2E 또는 핵심 UseCase/Repository 경로 확인
   - 특히 멀티테넌시, 인증, 급여 스냅샷, 평탄 DTO를 재확인

## 3. 변경 유형별 체크 포인트

### API 변경

- `src/app/api/**/route.ts`에서 `withAuth` 또는 적절한 인증 래퍼를 사용하는가
- `companyId` 경계가 읽기와 쓰기 모두에 반영되는가
- 프론트에서 쓰는 필드명으로 응답을 평탄화했는가
- 에러 메시지가 한국어로 전달되는가

### UseCase 변경

- Repository Port만 의존하는가
- ValidationError 메시지가 한국어인가
- 급여/근태 계산 로직이 application/domain 안에 남아 있는가

### Repository / Prisma 변경

- write 전에 대상 레코드의 `companyId` 소속 검증이 있는가
- 새 필드가 schema, seed, API, UI 중 필요한 모든 경계에 반영되었는가
- RLS 또는 tenant extension과 충돌하지 않는가

### SWR Hook / 프론트 변경

- Hook의 반환 shape가 API와 정확히 맞는가
- auth page 예외, refresh, 캐시 무효화 규칙과 충돌하지 않는가
- `null` SWR key가 필요한 조건이 빠지지 않았는가

## 4. 회귀 위험 구간

아래는 변경량이 작아도 우선 검토하는 구간이다.

- 급여 계산
  - `AttendanceClassifier`
  - `GrossPayCalculator`
  - `DeductionCalculator`
  - `InsuranceCalculator`
  - `TaxCalculator`
  - `PayrollCalculator`
- 근태 확정/취소
  - `ConfirmAttendanceUseCase`
  - 스냅샷 생성/삭제
- 인증과 라우팅
  - `src/proxy.ts`
  - `src/lib/api.ts`
  - `src/hooks/useAuth.ts`
- 멀티테넌시
  - Repository `findFirst({ id, companyId })` 패턴
  - tenant isolation tests
- 세무 보고서
  - `src/app/api/tax/**`
  - `src/application/dtos/tax.ts`
  - `src/hooks/useTax.ts`

## 5. 기본 검증 명령

### 공통

```bash
npm run type-check
npm run test
```

### 필요 시 E2E

```bash
npx playwright test e2e/payroll-integration.spec.ts --project=chromium
npx playwright test e2e/settings-company.spec.ts
npx playwright test e2e/attendance-confirm.spec.ts
```

### 멀티테넌시 관련 변경 시

```bash
npx vitest run src/infrastructure/persistence/repositories/__tests__/tenant-isolation.test.ts
```

## 6. 변경 영향 + 검증 체크리스트 템플릿

기능 작업마다 아래 형식으로 변경 기록이나 리뷰 메모를 남긴다.

```md
## 변경 영향

- 사용자 영향:
- API 계약 영향:
- 스키마/데이터 영향:
- 권한/테넌트 영향:
- 회귀 위험:

## 검증 체크리스트

- [ ] DTO/응답 shape 확인
- [ ] `companyId` 경계 확인
- [ ] 레이어 위반 없음 확인
- [ ] `npm run type-check`
- [ ] `npm run test`
- [ ] 필요한 E2E 또는 대상 테스트 실행
```

## 7. 세무 WIP 전용 검증 순서

세무 변경은 아래 순서를 우선 적용한다.

1. `src/application/dtos/tax.ts`의 타입이 API와 UI 모두에 맞는지 확인
2. `src/hooks/useTax.ts`의 SWR key와 반환 shape를 확인
3. `src/app/api/tax/**`가 `getContainer()`와 `withAuth`를 준수하는지 확인
4. 회사 확장 필드가 `schema -> settings API -> tax report`로 연결되는지 확인
5. 직원별 상세/영수증 조회가 타 회사 사용자에게 노출되지 않는지 확인

## 8. 문서 연결점

- 구조 기준선: `docs/ARCHITECTURE-MAP.md`
- 상위 제품/요구사항: `docs/PRD.md`, `docs/MVP.md`
- 변경 의도와 교훈: `docs/DEVLOG.md`
- 프로젝트 전역 규칙: `CLAUDE.md`

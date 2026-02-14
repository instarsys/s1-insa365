---
name: db-migration
description: Prisma 스키마 마이그레이션 가이드. 스키마 변경 감지, 위험도 평가, RLS 확인, 마이그레이션 생성, 빌드 검증, Clean Architecture 체크리스트까지 안내합니다.
argument-hint: "[선택사항: 마이그레이션 이름 또는 변경 설명]"
---

# Prisma 스키마 마이그레이션 가이드

## 목적

Prisma 스키마 변경 시 안전한 마이그레이션을 수행합니다:

1. 스키마 변경사항 감지 및 위험도 평가
2. RLS 정책 필요 여부 확인
3. 마이그레이션 SQL 생성 및 위험 패턴 검사
4. 빌드 검증 (`prisma generate` + `next build`)
5. 새 모델인 경우 Clean Architecture 체크리스트 안내
6. 프로덕션 배포 체크리스트

## 실행 시점

- Prisma 스키마에 모델/필드를 추가하거나 변경할 때
- 새로운 도메인 엔티티를 추가할 때
- 기존 테이블에 컬럼을 추가/삭제/변경할 때
- 인덱스나 제약 조건을 변경할 때

## 워크플로우

### Step 1: 스키마 변경사항 감지

현재 스키마 변경사항을 확인합니다:

```bash
cd frontend && git diff HEAD -- prisma/schema.prisma
```

변경이 없으면 `git diff` (unstaged)도 확인합니다. 인수로 변경 설명이 제공된 경우 해당 내용을 참조합니다.

**표시:**

```markdown
## 스키마 변경사항 감지

| 변경 유형 | 대상 | 상세 |
|-----------|------|------|
| 모델 추가 | `NewModel` | 새 테이블 생성 |
| 필드 추가 | `User.newField` | String? 타입 |
| 필드 변경 | `Order.status` | enum 값 추가 |
```

### Step 2: 위험도 평가

변경 유형별 위험도를 평가합니다:

| 위험도 | 변경 유형 | 설명 |
|--------|-----------|------|
| **LOW** | 새 모델 추가, nullable 필드 추가, 인덱스 추가 | 데이터 손실 없음 |
| **MEDIUM** | default 있는 NOT NULL 필드 추가, enum 값 추가, 관계 추가 | 주의 필요 |
| **HIGH** | 필드 삭제, 타입 변경, NOT NULL without DEFAULT, 테이블 삭제 | 데이터 손실 위험 |

**HIGH 위험도 발견 시:**

```markdown
⚠️ **HIGH 위험도 변경 감지**

- `DROP COLUMN`, `NOT NULL without DEFAULT` 등 데이터 손실 가능성
- 프로덕션 데이터 백업 후 진행을 권장합니다
- 필요시 2단계 마이그레이션 (먼저 nullable 추가 → 데이터 채우기 → NOT NULL 설정)
```

### Step 3: RLS 정책 확인

새 모델에 `tenantId` 필드가 있는지 확인합니다:

```bash
# 기존 RLS 마이그레이션 패턴 참조
grep -l "CREATE POLICY\|ENABLE ROW LEVEL SECURITY" frontend/prisma/migrations/*/migration.sql
```

**RLS가 필요한 경우** (tenantId가 있는 새 모델):

```markdown
### RLS 정책 필요

새 모델 `<ModelName>`에 `tenantId`가 있으므로 RLS 정책이 필요합니다.

기존 패턴 참조: `frontend/prisma/migrations/20251213_add_database_rls/migration.sql`

마이그레이션 SQL에 다음을 추가해야 합니다:
- `ALTER TABLE "<table>" ENABLE ROW LEVEL SECURITY;`
- `CREATE POLICY "<table>_tenant_isolation" ON "<table>" ...`
```

### Step 4: 마이그레이션 SQL 생성

```bash
cd frontend && npx prisma migrate dev --name <migration-name> --create-only
```

인수로 마이그레이션 이름이 제공된 경우 사용하고, 없으면 변경 내용을 기반으로 적절한 이름을 제안합니다.

**이름 규칙:** `YYYYMMDD_<설명>` (예: `20260215_add_notification_table`)

### Step 5: 생성된 SQL 위험 패턴 검사

생성된 마이그레이션 SQL 파일을 읽고 위험 패턴을 검색합니다:

```bash
# 최신 마이그레이션 파일 찾기
ls -td frontend/prisma/migrations/*/migration.sql | head -1
```

파일을 읽고 다음 패턴을 검색합니다:

| 패턴 | 위험도 | 설명 |
|------|--------|------|
| `DROP TABLE` | HIGH | 테이블 삭제 |
| `DROP COLUMN` | HIGH | 컬럼 삭제 |
| `NOT NULL` (without `DEFAULT`) | HIGH | 기존 행 에러 |
| `ALTER COLUMN...TYPE` | MEDIUM | 타입 변환 실패 가능 |
| `DROP INDEX` | LOW | 성능 영향 가능 |

**위험 패턴 발견 시** `AskUserQuestion`으로 진행 여부 확인.

### Step 6: Prisma Generate + 빌드 검증

```bash
cd frontend && npx prisma generate
```

생성 성공 후 빌드 검증:

```bash
cd frontend && npx next build 2>&1 | tail -20
```

**실패 시:** 에러 메시지를 분석하고 수정 방법을 제안합니다.

### Step 7: Clean Architecture 체크리스트 (새 모델인 경우)

새 모델이 추가된 경우 다음 파일들이 필요합니다:

```markdown
### Clean Architecture 체크리스트

| # | 파일 | 상태 |
|---|------|------|
| 1 | `domain/entities/<Name>.ts` | Entity 클래스 |
| 2 | `domain/repositories/I<Name>Repository.ts` | Repository Interface |
| 3 | `application/usecases/<Name>/` | CRUD UseCase |
| 4 | `application/dto/<Name>Dto.ts` | Request/Response DTO |
| 5 | `infrastructure/repositories/Prisma<Name>Repository.ts` | Prisma Repository 구현 |
| 6 | `infrastructure/factories/UseCaseFactory.ts` | 의존성 등록 |
```

기존 패턴을 참조하여 skeleton 코드 생성을 제안합니다.

### Step 8: 프로덕션 배포 체크리스트

```markdown
### 프로덕션 배포 체크리스트

- [ ] 마이그레이션 SQL 리뷰 완료
- [ ] 로컬 `prisma migrate dev` 성공
- [ ] `prisma generate` + `next build` 성공
- [ ] (새 모델) RLS 정책 추가
- [ ] (새 모델) Clean Architecture 파일 생성
- [ ] Git commit + push
- [ ] Railway 자동 배포 → `start.sh`에서 `prisma migrate deploy` 실행됨
- [ ] 프로덕션 `/api/health` 확인
```

## 예외사항

다음은 **문제가 아닙니다**:

1. **Prisma enrich 필드** — `@map`, `@@map`, `@relation` 등의 어노테이션 변경은 실제 DB 변경 없이 ORM 매핑만 변경
2. **개발 전용 시드 데이터** — `prisma/seed-test.ts` 변경은 마이그레이션과 무관
3. **주석/formatting** — 스키마 파일의 주석이나 공백 변경은 마이그레이션 생성 안 됨
4. **`prisma generate` 캐시** — `.prisma/client/` 디렉토리의 변경은 자동 생성 파일

## Related Files

| File | Purpose |
|------|---------|
| `frontend/prisma/schema.prisma` | Prisma 스키마 정의 (33 모델, 21 enum) |
| `frontend/prisma/migrations/` | 마이그레이션 히스토리 (31개) |
| `frontend/prisma/migrations/20251213_add_database_rls/migration.sql` | RLS 정책 패턴 참조 |
| `frontend/start.sh` | 프로덕션 시작 스크립트 (`prisma migrate deploy` 포함) |
| `frontend/Dockerfile` | Docker 빌드 설정 |
| `frontend/src/infrastructure/factories/UseCaseFactory.ts` | UseCase 의존성 주입 팩토리 |
| `frontend/src/domain/entities/` | Domain Entity 클래스 위치 |
| `frontend/src/domain/repositories/` | Repository Interface 위치 |
| `frontend/src/infrastructure/repositories/` | Prisma Repository 구현체 위치 |

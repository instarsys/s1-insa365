---
name: api-test
description: UseCase 단위 테스트 및 API 통합 테스트 생성 가이드. 대상 분석, Mock 생성, 테스트 케이스 도출, 테스트 작성 및 실행을 안내합니다.
argument-hint: "<UseCase 이름 또는 API 경로>"
---

# UseCase 단위 / API 통합 테스트 생성

## 목적

Clean Architecture UseCase의 단위 테스트와 API 통합 테스트를 체계적으로 생성합니다:

1. 대상 UseCase의 구조 분석 (의존성, 입출력, 비즈니스 규칙)
2. Repository Interface 기반 Mock 생성
3. 테스트 케이스 자동 도출 (Happy path, Error cases, Edge cases)
4. 단위 테스트 작성
5. API 통합 테스트 생성 (Playwright 패턴)
6. 테스트 실행 및 결과 확인

## 실행 시점

- 새로운 UseCase를 구현한 후
- 기존 UseCase에 비즈니스 로직을 추가한 후
- API 엔드포인트를 생성하거나 수정한 후
- 버그를 수정한 후 회귀 테스트가 필요할 때

## 워크플로우

### Step 1: 대상 UseCase 분석

인수로 제공된 UseCase 이름 또는 API 경로를 기반으로 대상 파일을 찾습니다:

```bash
# UseCase 이름으로 검색
find frontend/src/application/usecases -name "*<name>*" -type f

# API 경로로 UseCase 역추적
grep -r "<UseCase>" frontend/app/api/ --include="*.ts" -l
```

대상 UseCase 파일을 읽고 다음을 분석합니다:

**Constructor 의존성:**
```markdown
| 의존성 | 타입 | Interface 위치 |
|--------|------|---------------|
| customerRepo | ICustomerRepository | domain/repositories/ICustomerRepository.ts |
| permissionService | PermissionService | domain/services/PermissionService.ts |
```

**execute() 메서드 분석:**
```markdown
| 항목 | 내용 |
|------|------|
| 입력 (DTO) | CreateCustomerRequestDto |
| 출력 (Result) | Result<CustomerResponseDto> |
| 비즈니스 규칙 | tenantId 검증, 권한 확인, 중복 체크 |
| 에러 케이스 | UNAUTHORIZED, DUPLICATE, VALIDATION_ERROR |
```

### Step 2: Repository Interface 분석

UseCase가 의존하는 Repository Interface의 시그니처를 파악합니다:

```bash
# Interface 파일 읽기
cat frontend/src/domain/repositories/I<Name>Repository.ts
```

각 메서드의 입출력 타입을 기록합니다:

```markdown
| 메서드 | 입력 | 출력 |
|--------|------|------|
| findById | (id: string, tenantId: string) | Promise<Entity \| null> |
| create | (entity: Entity) | Promise<Entity> |
| findByPhone | (phone: string, tenantId: string) | Promise<Entity \| null> |
```

### Step 3: 테스트 케이스 도출

UseCase의 execute() 로직을 기반으로 테스트 케이스를 자동 도출합니다:

**Happy Path:**
- 정상 입력으로 성공 결과 반환
- 모든 의존성이 기대한 대로 호출됨

**Error Cases:**
- 권한 없음 (tenantId 불일치, 역할 부족)
- 유효성 검증 실패 (필수 필드 누락, 형식 오류)
- 중복 데이터 (이미 존재하는 리소스)
- 리소스 미존재 (수정/삭제 대상 없음)

**Edge Cases:**
- 빈 문자열, 경계값, 특수문자
- 동시 요청 (낙관적 잠금)
- 연관 데이터 존재 시 삭제

```markdown
### 도출된 테스트 케이스

| # | 분류 | 설명 | 예상 결과 |
|---|------|------|-----------|
| 1 | Happy | 정상 생성 | Result.ok(dto) |
| 2 | Error | 권한 없음 | Result.fail("UNAUTHORIZED") |
| 3 | Error | 중복 데이터 | Result.fail("DUPLICATE") |
| 4 | Edge | 빈 이름 | Result.fail("VALIDATION_ERROR") |
```

### Step 4: Mock Repository 생성

Interface를 기반으로 Mock 객체를 생성합니다:

```typescript
// __tests__/mocks/Mock<Name>Repository.ts
import { I<Name>Repository } from '@/domain/repositories/I<Name>Repository';

export const createMock<Name>Repository = (): jest.Mocked<I<Name>Repository> => ({
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  // ... Interface의 모든 메서드
});
```

**Result 클래스 참조:** `frontend/src/domain/shared/Result.ts`

### Step 5: 단위 테스트 작성

테스트 파일 위치: `frontend/src/application/usecases/<Domain>/__tests__/<UseCaseName>.test.ts`

```typescript
import { <UseCaseName> } from '../<UseCaseName>';
import { createMock<Name>Repository } from './mocks/Mock<Name>Repository';
import { Result } from '@/domain/shared/Result';

describe('<UseCaseName>', () => {
  let useCase: <UseCaseName>;
  let mockRepo: jest.Mocked<I<Name>Repository>;

  beforeEach(() => {
    mockRepo = createMock<Name>Repository();
    useCase = new <UseCaseName>(mockRepo);
  });

  describe('Happy Path', () => {
    it('should <expected behavior>', async () => {
      // Arrange
      mockRepo.findById.mockResolvedValue(entity);
      // Act
      const result = await useCase.execute(dto);
      // Assert
      expect(result.isSuccess).toBe(true);
    });
  });

  describe('Error Cases', () => {
    it('should fail when unauthorized', async () => {
      // ...
    });
  });
});
```

### Step 6: API 통합 테스트 생성 (선택적)

기존 Playwright E2E 패턴을 참조하여 API 레벨 통합 테스트를 생성합니다.

**인증 패턴 참조:** `frontend/tests/auth.setup.ts`

```typescript
// frontend/tests/<domain>.spec.ts
import { test, expect } from '@playwright/test';

test.describe('<Domain> API', () => {
  test.use({ storageState: 'frontend/tests/.auth/user.json' });

  test('POST /api/<endpoint> - 정상 생성', async ({ request }) => {
    const response = await request.post('/api/<endpoint>', {
      data: { /* request body */ }
    });
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.success).toBe(true);
  });
});
```

**E2E 테스트 주의사항:**
- `waitForLoadState('networkidle')` 사용 금지 (SWR 폴링)
- `getByText()` strict mode 위반 시 `.first()` 사용
- 온보딩 모달 dismiss 처리 (`beforeEach`)

### Step 7: 테스트 실행 및 결과

```bash
# 단위 테스트 실행
cd frontend && npx jest --testPathPattern="<test-file>" --verbose

# E2E 테스트 실행
cd frontend && npx playwright test <test-file> --reporter=list
```

```markdown
## 테스트 결과

### 단위 테스트
| # | 테스트 케이스 | 상태 |
|---|--------------|------|
| 1 | 정상 생성 | PASS |
| 2 | 권한 없음 | PASS |
| 3 | 중복 데이터 | PASS |

### API 통합 테스트 (해당 시)
| # | 테스트 케이스 | 상태 |
|---|--------------|------|
| 1 | POST 정상 생성 | PASS |
| 2 | GET 목록 조회 | PASS |
```

## 예외사항

다음은 **문제가 아닙니다**:

1. **Domain Service 의존성** — UseCase가 Repository 외에 Domain Service에 의존하는 경우, Service도 Mock 대상이지만 통합 테스트에서는 실제 구현 사용 가능
2. **외부 API Mock** — 차량번호 조회, SMS 발송 등 외부 API는 항상 Mock 처리
3. **Prisma 관련 타입** — 단위 테스트에서는 Prisma 타입을 직접 사용하지 않고 Domain Entity 타입 사용
4. **E2E 테스트 환경** — E2E 테스트는 실행 중인 서버가 필요하며, 테스트 DB에 시드 데이터가 있어야 함

## Related Files

| File | Purpose |
|------|---------|
| `frontend/src/application/usecases/` | UseCase 구현 디렉토리 |
| `frontend/src/domain/repositories/` | Repository Interface 디렉토리 |
| `frontend/src/domain/shared/Result.ts` | Result 모나드 (성공/실패 래핑) |
| `frontend/src/domain/entities/` | Domain Entity 클래스 |
| `frontend/src/application/dto/` | Request/Response DTO |
| `frontend/tests/` | E2E 테스트 디렉토리 |
| `frontend/tests/auth.setup.ts` | Playwright 인증 설정 |
| `frontend/src/infrastructure/factories/UseCaseFactory.ts` | UseCase 의존성 주입 팩토리 |

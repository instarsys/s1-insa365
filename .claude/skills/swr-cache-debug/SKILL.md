---
name: swr-cache-debug
description: SWR 캐시 무효화 진단 가이드. 캐시 설정 분석, mutate 패턴 검증, cross-entity 무효화, HTTP Cache-Control 헤더를 점검하고 문제 해결을 안내합니다.
argument-hint: "[선택사항: 엔티티명 또는 증상 설명]"
---

# SWR 캐시 무효화 진단

## 목적

SWR 캐시 관련 문제를 체계적으로 진단하고 해결합니다:

1. `cache-config.ts` 캐시 설정 매트릭스 분석
2. CUD 작업의 `mutate()` 패턴 검증
3. Cross-entity invalidation 확인
4. `useFetchList`의 `cacheType` 매핑 검증
5. HTTP Cache-Control 헤더 검증
6. Optimistic Update 롤백 확인
7. 진단 보고서 및 수정 권장사항

## 실행 시점

- 데이터를 수정했는데 UI에 반영되지 않을 때
- 목록 페이지가 최신 데이터를 표시하지 않을 때
- 다른 엔티티 수정 시 연관 데이터가 갱신되지 않을 때
- 새 CUD API를 추가한 후 캐시 무효화를 설정할 때
- 캐시 TTL이나 전략을 변경한 후

## 워크플로우

### Step 1: 캐시 설정 매트릭스 분석

`cache-config.ts`를 읽고 현재 캐시 전략을 분석합니다:

Read `frontend/lib/cache-config.ts`

```markdown
### 캐시 설정 매트릭스

| cacheType | dedupInterval | refreshInterval | HTTP maxAge | 용도 |
|-----------|--------------|-----------------|-------------|------|
| realtime | 5s | 5s | 5 | 대시보드, 주문 목록 |
| master | 15s | - | 15 | 부품, 서비스 마스터 |
| static | 60s | - | 60 | 통계, 설정 |
```

인수로 엔티티명이 제공된 경우, 해당 엔티티의 캐시 설정에 집중합니다.

### Step 2: CUD 작업의 mutate() 패턴 검증

데이터를 변경하는 모든 작업(Create, Update, Delete)에서 적절한 `mutate()` 호출이 있는지 확인합니다:

```bash
# mutate 사용처 검색
grep -rn "mutate(" frontend/components/ frontend/app/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".next"
```

**올바른 패턴:**

```typescript
// 키 프리픽스 기반 무효화 (권장)
mutate(
  (key) => typeof key === "string" && key.startsWith("/api/customers"),
  undefined,
  { revalidate: true }
);
```

**잘못된 패턴:**

```typescript
// 단일 키만 무효화 (목록 갱신 누락 가능)
mutate("/api/customers/123");

// 전체 캐시 무효화 (과도한 리페치)
mutate(() => true);
```

인수로 제공된 엔티티의 CUD 작업을 우선 검색합니다:

```bash
# 특정 엔티티의 API 호출 + mutate 패턴
grep -rn "/api/<entity>" frontend/components/ frontend/app/ --include="*.ts" --include="*.tsx" -A 5 | grep -E "(POST|PUT|PATCH|DELETE|mutate)"
```

### Step 3: Cross-entity Invalidation 확인

엔티티 간 연관 관계를 확인하고, CUD 시 연관 엔티티의 캐시도 무효화하는지 검증합니다:

**핵심 연관 관계:**

```
Customer → Vehicle (1:N)
Vehicle → RepairOrder (1:N)
RepairOrder → RepairOrderItem (1:N)
RepairOrder → Payment (1:N)
RepairOrder 상태 변경 → Dashboard 통계
```

**확인 예시:**
- 주문(Order) 삭제 시 → 고객(Customer) 상세의 주문 목록도 갱신?
- 결제(Payment) 추가 시 → 주문(Order) 상세의 결제 정보도 갱신?
- 주문 상태 변경 시 → 대시보드(Dashboard) 통계도 갱신?

```bash
# 주문 관련 mutate에서 연관 엔티티 무효화 확인
grep -rn "mutate" frontend/components/orders/ frontend/app/**/orders/ --include="*.ts" --include="*.tsx" -B 2 -A 5
```

### Step 4: useFetchList cacheType 매핑 검증

`useFetchList` 훅 사용처의 `cacheType`이 올바르게 매핑되어 있는지 확인합니다:

```bash
# useFetchList 사용처와 cacheType 확인
grep -rn "useFetchList" frontend/components/ frontend/app/ --include="*.ts" --include="*.tsx" -A 3
```

**검증 기준:**

| 페이지 | 권장 cacheType | 이유 |
|--------|---------------|------|
| 대시보드 | `realtime` | 실시간 통계 |
| 주문 목록 | `realtime` | 빈번한 상태 변경 |
| 고객 목록 | `realtime` | CUD 빈번 |
| 부품 목록 | `master` | 변경 빈도 낮음 |
| 서비스 항목 | `master` | 변경 빈도 낮음 |
| 통계/리포트 | `static` | 변경 빈도 매우 낮음 |

### Step 5: HTTP Cache-Control 헤더 검증

`cachedSuccessResponse`를 사용하는 API에서 올바른 Cache-Control 헤더를 설정하는지 확인합니다:

```bash
# cachedSuccessResponse 사용처
grep -rn "cachedSuccessResponse" frontend/app/api/ --include="*.ts" -B 2 -A 5
```

Read `frontend/lib/api-helpers.ts`에서 `cachedSuccessResponse` 구현 확인.

**확인 사항:**
- `max-age` 값이 cacheType과 일치하는지
- `s-maxage` (CDN 캐시)가 적절한지
- `stale-while-revalidate`가 설정되어 있는지

### Step 6: Optimistic Update 사용처 확인

Optimistic Update를 사용하는 곳에서 롤백(rollback) 처리가 올바른지 확인합니다:

```bash
# optimisticData 사용처
grep -rn "optimisticData\|optimistic" frontend/components/ frontend/hooks/ --include="*.ts" --include="*.tsx" -B 2 -A 10
```

**올바른 패턴:**

```typescript
mutate(key, updatedData, {
  optimisticData: newData,
  rollbackOnError: true,
  revalidate: true,
});
```

### Step 7: 진단 보고서

```markdown
## SWR 캐시 진단 보고서

### 캐시 설정 요약
| cacheType | 사용처 수 | 설정 |
|-----------|----------|------|
| realtime | X개 | 5s dedup, 5s refresh |
| master | Y개 | 15s dedup |
| static | Z개 | 60s dedup |

### mutate 패턴 검증
| 엔티티 | CUD 작업 | mutate 호출 | 상태 |
|--------|----------|------------|------|
| Customer | Create | 프리픽스 기반 | PASS |
| Order | Update | 단일 키만 | WARN |

### Cross-entity 무효화
| 트리거 | 연관 엔티티 | 무효화 | 상태 |
|--------|------------|--------|------|
| Order 삭제 | Customer 상세 | 있음 | PASS |
| Payment 추가 | Order 상세 | 없음 | FAIL |

### 수정 권장사항
| # | 위치 | 문제 | 해결 방법 |
|---|------|------|-----------|
| 1 | `components/orders/...` | 결제 추가 시 Order mutate 누락 | mutate 추가 |
| 2 | `app/.../page.tsx` | cacheType 미설정 | master 추가 |
```

## 예외사항

다음은 **문제가 아닙니다**:

1. **SWR dedup 기간 내 중복 요청 생략** — `dedupingInterval` 내에서 동일 키 요청이 생략되는 것은 정상 동작
2. **페이지 전환 시 잠깐 이전 데이터 표시** — SWR의 stale-while-revalidate 전략에 의한 정상 동작
3. **새 탭에서 최신 데이터 로드** — `revalidateOnFocus`가 활성화되어 있으면 탭 전환 시 자동 갱신
4. **서버 컴포넌트의 캐시** — Next.js 서버 컴포넌트의 `fetch` 캐시는 SWR과 별개 메커니즘

## Related Files

| File | Purpose |
|------|---------|
| `frontend/lib/cache-config.ts` | 캐시 타입별 설정 매트릭스 (TTL, dedup, HTTP maxAge) |
| `frontend/hooks/use-fetch-list.ts` | SWR 기반 목록 조회 훅 (cacheType 적용) |
| `frontend/lib/api-helpers.ts` | API 헬퍼 (cachedSuccessResponse, HTTP Cache-Control) |
| `frontend/components/customers/` | 고객 관련 컴포넌트 (mutate 패턴 참조) |
| `frontend/components/orders/` | 주문 관련 컴포넌트 (cross-entity mutate 참조) |
| `frontend/components/dashboard/` | 대시보드 (realtime 캐시 참조) |

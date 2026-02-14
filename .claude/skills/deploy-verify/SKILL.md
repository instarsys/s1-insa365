---
name: deploy-verify
description: 프로덕션 배포 후 스모크 테스트. HTTP 연결, 헬스체크, SSL/CDN 검증, 리다이렉트, 인증 API, 성능 메트릭을 확인합니다.
argument-hint: "[선택사항: quick|full]"
---

# 프로덕션 배포 후 스모크 테스트

## 목적

프로덕션 배포 후 서비스 정상 동작을 빠르게 확인합니다:

1. HTTP 기본 연결 확인 (200, 응답 시간)
2. `/api/health` 헬스체크 (DB 연결)
3. SSL/Cloudflare CDN 프록시 검증
4. 도메인 리다이렉트 확인
5. 공개/인증 API 스모크 테스트
6. 성능 메트릭 확인

## 실행 시점

- Railway에 자동 배포 완료 후
- 프로덕션 DB 마이그레이션 후
- Cloudflare 설정 변경 후
- 도메인/SSL 관련 변경 후
- 장애 대응 후 복구 확인

## 워크플로우

### Step 1: HTTP 기본 연결

```bash
curl -s -o /dev/null -w "HTTP %{http_code} | TTFB: %{time_starttransfer}s | Total: %{time_total}s" https://7carpro.co.kr
```

**PASS 기준:**
- HTTP 200
- TTFB < 2초
- Total < 3초

**FAIL 시:** DNS, Cloudflare, Railway 순서로 진단.

### Step 2: 헬스체크 API

```bash
curl -s https://7carpro.co.kr/api/health | python -m json.tool 2>/dev/null || curl -s https://7carpro.co.kr/api/health
```

**PASS 기준:**
- HTTP 200
- 응답에 DB 연결 상태 포함
- `status: "ok"` 또는 동등한 정상 표시

**FAIL 시:** DB 연결 문제 → AWS RDS 보안 그룹, Railway 환경변수 `DATABASE_URL` 확인.

### Step 3: SSL/Cloudflare 프록시 검증

```bash
curl -s -I https://7carpro.co.kr | grep -iE "^(cf-ray|server|strict-transport|x-frame|content-security)"
```

**확인 항목:**

| 헤더 | 기대값 | 설명 |
|------|--------|------|
| `cf-ray` | 존재 | Cloudflare 프록시 활성화 |
| `server` | `cloudflare` | Cloudflare CDN |
| `strict-transport-security` | `max-age=...` | HSTS 활성화 |

### Step 4: 도메인 리다이렉트 확인

```bash
curl -s -o /dev/null -w "HTTP %{http_code} → %{redirect_url}" -L --max-redirs 0 https://7carpro.com 2>/dev/null; echo
```

**PASS 기준:**
- `7carpro.com` → `7carpro.co.kr` 리다이렉트 (301 또는 302)

### Step 5: 공개 API 응답 검증

인증 불필요한 공개 API 응답을 확인합니다:

```bash
# 로그인 페이지 접근
curl -s -o /dev/null -w "%{http_code}" https://7carpro.co.kr/login

# 헬스체크 상세
curl -s https://7carpro.co.kr/api/health
```

### Step 6: 인증 API 스모크 테스트

잘못된 인증 정보로 적절한 에러 응답이 오는지 확인합니다:

```bash
# 잘못된 로그인 → 400 또는 401 기대
curl -s -X POST https://7carpro.co.kr/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"companyCode":"INVALID","email":"test@test.com","password":"wrong"}' \
  -w "\nHTTP %{http_code}"
```

**PASS 기준:**
- HTTP 400 또는 401 (적절한 에러 응답)
- 에러 메시지가 포함된 JSON 응답

**FAIL 기준:**
- HTTP 500 (서버 에러) → 배포 실패 가능성
- 타임아웃 → 서버 미응답

### Step 7: 마이그레이션 파일 수 확인

로컬 마이그레이션 파일 수를 확인하여 프로덕션과 동기화 상태를 점검합니다:

```bash
ls -d frontend/prisma/migrations/*/ | wc -l
```

최근 마이그레이션 확인:

```bash
ls -td frontend/prisma/migrations/*/ | head -3
```

### Step 8: 성능 메트릭 종합

```bash
# 주요 페이지 응답 시간
curl -s -o /dev/null -w "login: %{time_total}s\n" https://7carpro.co.kr/login
curl -s -o /dev/null -w "health: %{time_total}s\n" https://7carpro.co.kr/api/health
```

**성능 기준:**

| 메트릭 | 기준 | 설명 |
|--------|------|------|
| TTFB | < 2초 | 서버 첫 바이트 응답 |
| 메인 페이지 로드 | < 3초 | 전체 페이지 로드 |
| API 응답 | < 1초 | 단순 API 호출 |

### Step 9: 결과 보고

인수가 `quick`이면 Step 1-2만 실행, `full`이면 전체 실행합니다.

```markdown
## 프로덕션 스모크 테스트 결과

| # | 검사 | 상태 | 상세 |
|---|------|------|------|
| 1 | HTTP 연결 | PASS | 200, 1.2s |
| 2 | 헬스체크 | PASS | DB connected |
| 3 | SSL/CDN | PASS | cf-ray 존재 |
| 4 | 리다이렉트 | PASS | .com → .co.kr |
| 5 | 공개 API | PASS | 200 |
| 6 | 인증 API | PASS | 401 (정상 거부) |
| 7 | 마이그레이션 | INFO | 31개 파일 |
| 8 | 성능 | PASS | TTFB 0.8s |

**전체 결과: PASS** — 프로덕션 정상 운영 중
```

## 예외사항

다음은 **문제가 아닙니다**:

1. **TTFB 일시적 증가** — 콜드 스타트 시 첫 요청이 느릴 수 있음 (Railway 슬립 모드)
2. **Cloudflare 캐시 미스** — 배포 직후 캐시 미스로 응답이 느릴 수 있음
3. **인증 API 401/400** — 잘못된 인증 정보에 대한 정상 에러 응답
4. **마이그레이션 파일 수 차이** — 로컬에 `--create-only`로 미적용 파일이 있을 수 있음

## Related Files

| File | Purpose |
|------|---------|
| `frontend/app/api/health/route.ts` | 헬스체크 API 엔드포인트 |
| `frontend/start.sh` | 프로덕션 시작 스크립트 (migrate deploy + 서버 시작) |
| `frontend/Dockerfile` | Docker 빌드 설정 |
| `frontend/prisma/migrations/` | 마이그레이션 히스토리 |

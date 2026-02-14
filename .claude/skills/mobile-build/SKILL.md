---
name: mobile-build
description: EAS Build 디버깅 및 배포 가이드. 설정 검증, 의존성 확인, Prebuild 디버깅, 프로파일별 빌드, 스토어 배포 체크리스트를 안내합니다.
argument-hint: "[선택사항: development|preview|production 또는 에러 메시지]"
---

# EAS Build 디버깅 및 배포 가이드

## 목적

Expo/EAS 빌드 문제를 체계적으로 진단하고 해결합니다:

1. `app.json`, `eas.json`, `package.json` 설정 무결성 검증
2. SDK/플러그인 의존성 호환성 확인
3. 에셋 파일 존재 확인
4. Prebuild 단계 디버깅
5. 프로파일별 EAS 빌드 실행
6. 스토어 배포 체크리스트

## 실행 시점

- EAS Build가 실패했을 때
- 새로운 네이티브 플러그인을 추가한 후
- 빌드 프로파일을 변경하거나 추가할 때
- 앱 스토어 배포를 준비할 때
- `npx expo prebuild` 에러가 발생했을 때

## 워크플로우

### Step 1: 설정 파일 무결성 검증

세 가지 핵심 설정 파일을 읽고 검증합니다:

**app.json 검증:**

```bash
cat 7carpro-mobile/app.json | python -m json.tool > /dev/null 2>&1 && echo "VALID JSON" || echo "INVALID JSON"
```

Read `7carpro-mobile/app.json` 후 확인:
- `expo.name`, `expo.slug` 설정 여부
- `expo.version`, `expo.android.versionCode`, `expo.ios.buildNumber` 존재
- `expo.plugins` 배열에 필요한 플러그인 등록
- `expo.android.package`, `expo.ios.bundleIdentifier` 설정

**eas.json 검증:**

Read `7carpro-mobile/eas.json` 후 확인:
- `build.development`, `build.preview`, `build.production` 프로파일 존재
- 각 프로파일의 `env.EXPO_PUBLIC_API_URL` 설정
- `submit` 설정 (스토어 배포용)

**package.json 검증:**

Read `7carpro-mobile/package.json` 후 확인:
- `expo` SDK 버전 (현재 SDK 54)
- `react-native` 버전 호환성
- 네이티브 의존성 버전 호환성

```markdown
### 설정 파일 검증 결과

| 파일 | 상태 | 이슈 |
|------|------|------|
| app.json | PASS/FAIL | 상세 |
| eas.json | PASS/FAIL | 상세 |
| package.json | PASS/FAIL | 상세 |
```

### Step 2: 의존성 호환성 확인

```bash
cd 7carpro-mobile && npx expo-doctor 2>&1
```

주요 확인 사항:
- SDK 54와 호환되지 않는 패키지
- 네이티브 모듈 버전 불일치
- peer dependency 경고

**주요 플러그인 호환성:**

| 플러그인 | 용도 | 확인 사항 |
|----------|------|-----------|
| `expo-router` | 파일 기반 라우팅 | Metro config 설정 |
| `expo-image-picker` | 사진 촬영/업로드 | 카메라 권한 설정 |
| `expo-notifications` | 푸시 알림 | FCM/APNs 설정 |
| `@gorhom/bottom-sheet` | BottomSheet UI | react-native-reanimated 호환 |

### Step 3: 에셋 파일 확인

앱 아이콘, 스플래시, 알림 아이콘 등 에셋 파일 존재를 확인합니다:

```bash
# app.json에서 참조하는 에셋 파일 경로 추출 후 존재 확인
ls 7carpro-mobile/assets/icon.png 2>/dev/null && echo "OK" || echo "MISSING: icon.png"
ls 7carpro-mobile/assets/adaptive-icon.png 2>/dev/null && echo "OK" || echo "MISSING: adaptive-icon.png"
ls 7carpro-mobile/assets/splash-icon.png 2>/dev/null && echo "OK" || echo "MISSING: splash-icon.png"
ls 7carpro-mobile/assets/notification-icon.png 2>/dev/null && echo "OK" || echo "MISSING: notification-icon.png"
```

### Step 4: Prebuild 디버깅

Prebuild는 Expo 설정을 네이티브 프로젝트(android/, ios/)로 변환하는 단계입니다.

```bash
cd 7carpro-mobile && npx expo prebuild --clean 2>&1
```

**알려진 이슈:**
- EAS 클라우드 빌드에서 Prebuild 단계 실패 (이전 커밋도 동일 → 기존 이슈)
- 로컬 Prebuild 성공 여부와 무관하게 클라우드에서 실패할 수 있음

**Prebuild 실패 시 확인사항:**
1. `app.json`의 `plugins` 배열에서 잘못된 플러그인 참조
2. 네이티브 모듈의 config plugin 호환성
3. `expo-modules-autolinking` 관련 에러
4. `gradle` 또는 `CocoaPods` 의존성 충돌

**진단:**

```bash
# Android 네이티브 빌드 로그 확인 (prebuild 후)
cd 7carpro-mobile/android && ./gradlew assembleDebug 2>&1 | tail -50
```

### Step 5: EAS 빌드 실행

인수로 프로파일이 지정된 경우 해당 프로파일로, 없으면 `preview`로 빌드합니다.

| 프로파일 | 용도 | 명령어 |
|----------|------|--------|
| `development` | 개발용 (Expo Go 호환) | `eas build --profile development --platform android` |
| `preview` | 테스트용 APK 생성 | `eas build --profile preview --platform android` |
| `production` | 스토어 배포용 AAB/IPA | `eas build --profile production --platform android` |

```bash
cd 7carpro-mobile && eas build --profile <profile> --platform android 2>&1
```

**빌드 상태 확인:**

```bash
cd 7carpro-mobile && eas build:list --limit 5 2>&1
```

### Step 6: 환경변수 확인

각 빌드 프로파일의 환경변수 설정을 확인합니다:

Read `7carpro-mobile/eas.json`에서 환경변수 확인:

| 프로파일 | `EXPO_PUBLIC_API_URL` | 용도 |
|----------|----------------------|------|
| development | `http://localhost:4000` | 로컬 개발 |
| preview | 프로덕션 또는 스테이징 URL | 테스트 |
| production | `https://7carpro.co.kr` | 프로덕션 |

모바일 API 클라이언트 확인: Read `7carpro-mobile/lib/api.ts`에서 `EXPO_PUBLIC_API_URL` 사용 확인.

### Step 7: 스토어 배포 체크리스트

**Google Play Store (Android):**

```markdown
- [ ] `eas.json`의 production 프로파일에 `buildType: "app-bundle"` (AAB)
- [ ] `app.json`의 `android.versionCode` 증가
- [ ] `app.json`의 `version` 업데이트
- [ ] `eas build --profile production --platform android` 성공
- [ ] `eas submit --platform android` 또는 수동 업로드
- [ ] Play Console에서 검토 제출
```

**Apple App Store (iOS):**

```markdown
- [ ] Apple Developer 계정 설정
- [ ] `app.json`의 `ios.buildNumber` 증가
- [ ] `eas build --profile production --platform ios` 성공
- [ ] `eas submit --platform ios` 또는 Transporter 사용
- [ ] App Store Connect에서 검토 제출
```

### Step 8: 결과 보고

```markdown
## 모바일 빌드 결과

| 단계 | 상태 | 상세 |
|------|------|------|
| 설정 검증 | PASS/FAIL | |
| 의존성 확인 | PASS/FAIL | |
| 에셋 확인 | PASS/FAIL | |
| Prebuild | PASS/FAIL | |
| EAS 빌드 | PASS/FAIL | 빌드 ID: xxx |

### 다음 단계
- (성공 시) 테스트 기기에서 설치 확인
- (실패 시) 에러 원인 및 해결 방법
```

## 예외사항

다음은 **문제가 아닙니다**:

1. **Expo Go 미지원 경고** — 네이티브 모듈 사용 시 Expo Go에서 동작하지 않는 것은 정상. Development build 사용
2. **웹 전용 에러** — `Platform.OS === 'web'` 관련 에러는 모바일 빌드와 무관
3. **EAS 빌드 큐 대기** — Free 플랜에서 빌드 큐 대기는 정상 (최대 30분)
4. **Prebuild 경고** — `WARN` 레벨 메시지는 대부분 무시 가능, `ERROR`만 주의

## Related Files

| File | Purpose |
|------|---------|
| `7carpro-mobile/app.json` | Expo 앱 설정 (이름, 버전, 플러그인, 에셋) |
| `7carpro-mobile/eas.json` | EAS Build 프로파일 설정 |
| `7carpro-mobile/package.json` | 의존성 및 스크립트 |
| `7carpro-mobile/lib/api.ts` | API 클라이언트 (환경변수 사용) |
| `7carpro-mobile/app.config.js` | 동적 Expo 설정 (있는 경우) |
| `7carpro-mobile/metro.config.js` | Metro 번들러 설정 |
| `7carpro-mobile/babel.config.js` | Babel 설정 (reanimated 플러그인 등) |

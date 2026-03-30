# AutoParse 에이전트 지침

## 목표

티켓 파서(Server fetcher + Admin parser)의 파싱 성공률을 높인다.
랜덤 공연 ID를 탐색하여 파싱 실패 케이스를 발견하고, 파서 코드를 수정하여 모든 케이스를 통과시킨다.

## 자율 루프

### 라운드 구조

1. **서브에이전트: autoparse 실행**
   - `pnpm autoparse --count 10` 실행
   - 결과 요약만 메인 세션에 반환 (성공/실패 수, 실패 ID 목록)

2. **실패가 있으면 서브에이전트 디스패치** (플랫폼별 병렬 가능)
   - 각 서브에이전트는 `tools/autoparse/data/failures/{platform}-{id}.json` 읽기
   - rawResponse와 errors를 분석해서 파서 코드 수정
   - 수정한 파일 + 라인 + 변경 요약을 반환

3. **서브에이전트: 회귀 검증**
   - `pnpm autoparse --retry-failures` 실행
   - 통과/실패 요약 반환

4. **판단**
   - 모두 통과 → 다음 라운드 (새로운 ID 탐색)
   - 회귀 실패 → 수정 서브에이전트 재디스패치
   - N 라운드 후 → 사용자에게 결과 보고

### 서브에이전트 역할

| 역할 | 입력 | 출력 |
|------|------|------|
| autoparse-runner | CLI 명령 | 성공/실패 수, 실패 ID 목록 |
| autoparse-fixer | 실패 스냅샷 경로 1개 | 수정 파일, 라인, 변경 요약 |
| autoparse-verifier | `--retry-failures` | 통과/실패 요약 |

### 메인 세션 규칙

- 메인 세션은 **오케스트레이터 역할만** 수행
- rawHtml, 전체 파서 코드 등 큰 컨텍스트는 서브에이전트 안에서만 처리
- 메인 세션에는 요약만 올린다

## 제약

1. 한 서브에이전트는 **하나의 실패 케이스만** 수정한다
2. 수정 후 반드시 `--retry-failures`로 회귀 검증한다
3. 요청 딜레이(2초 이상)를 줄이지 않는다
4. `validator.ts`의 검증 규칙은 수정하지 않는다 (기준 완화 금지)
5. 독립적인 플랫폼 수정은 **병렬 서브에이전트**로 처리한다
6. `seeds.json`에 새로 발견한 유효 ID를 추가해도 된다

## 수정 대상 파일

### Server Fetchers
- `apps/server/src/performance/fetchers/melon.fetcher.ts`
- `apps/server/src/performance/fetchers/nol.fetcher.ts`
- `apps/server/src/performance/fetchers/ticketlink.fetcher.ts`

### Admin Parsers
- `apps/admin/src/app/api/scrape-schedule/parsers/melon.ts`
- `apps/admin/src/app/api/scrape-schedule/parsers/interpark.ts`
- `apps/admin/src/app/api/scrape-schedule/parsers/ticketlink.ts`

### Shared Types (필요 시)
- `packages/shared/src/index.ts`

## 성공 판정 기준

`pnpm autoparse --retry-failures`가 종료 코드 0으로 끝나면 해당 라운드 성공.

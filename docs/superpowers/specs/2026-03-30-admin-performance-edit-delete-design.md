# Admin 공연 수정/삭제 기능 디자인

## 개요

Admin 앱에서 공연(Performance)을 수정하고 삭제하는 기능 추가. 상세 페이지를 진입점으로 사용하며, 생성 폼을 재사용한다.

## 페이지 구조

| 페이지 | 경로 | 설명 |
|--------|------|------|
| 상세 | `/performances/[id]` | 공연 정보 조회 + 수정/삭제 버튼 |
| 수정 | `/performances/[id]/edit` | 생성 폼 재사용, 데이터 pre-fill |

**흐름:** 목록 → 카드 클릭 → 상세 페이지 → "수정" 또는 "삭제"

## 1. 목록 페이지 변경

- 각 카드를 `/performances/[id]`로 링크 (클릭 시 상세 페이지 이동)

## 2. 상세 페이지 (`/performances/[id]`)

- `api.performances.get(id)`로 데이터 조회
- 섹션별 읽기 전용 표시:
  - 기본 정보 (제목, 부제, 설명, 장르, 연령, 러닝타임, 인터미션, 주최, 포스터)
  - 공연장 (이름, 주소)
  - 스케줄 (날짜/시간 목록)
  - 티켓 (좌석등급, 가격)
  - 소스 정보 (플랫폼, 외부 URL, 티켓 오픈일, 예매 마감일, 판매 상태)
  - 아티스트 라인업
- 상단 액션 버튼:
  - "수정" → `/performances/[id]/edit`로 이동
  - "삭제" → 확인 다이얼로그 후 삭제 실행

## 3. 폼 컴포넌트 추출

현재 `new/page.tsx`에 있는 폼 로직을 `components/performance-form.tsx`로 추출:

```typescript
interface PerformanceFormProps {
  initialData?: Performance;
  onSubmit: (data: Record<string, unknown>) => void;
  mode: 'create' | 'edit';
}
```

- `mode === 'create'`: URL auto-fill 섹션 표시
- `mode === 'edit'`: 기존 데이터로 폼 초기화, auto-fill 숨김
- 공통 폼 섹션: 기본 정보, 공연장, 스케줄, 티켓, 소스 정보

## 4. 수정 페이지 (`/performances/[id]/edit`)

- `api.performances.get(id)`로 기존 데이터 로드
- `PerformanceForm`에 `initialData`와 `mode='edit'` 전달
- 제출 시 `api.performances.update(id, data)` 호출
- 아티스트 라인업은 수정 페이지 하단에 별도 섹션으로 관리 (`PUT /performances/:id/artists`)
- 저장 후 상세 페이지로 리다이렉트

## 5. 서버 API 변경

### PATCH `/performances/:id` 확장

현재는 Performance 기본 필드만 업데이트. 다음을 추가:

- **공연장:** venue name으로 upsert (생성 로직과 동일)
- **스케줄:** replace 방식 — 기존 전부 삭제 후 새로 생성
- **티켓:** replace 방식 — 소스의 티켓 전부 삭제 후 새로 생성
- **소스:** 기존 소스 필드 업데이트 (ticketOpenAt, bookingEndAt, salesStatus)

모두 하나의 Prisma 트랜잭션으로 처리.

### UpdatePerformanceDto 확장

기존 PartialType(CreatePerformanceDto)를 그대로 활용. CreatePerformanceDto에 이미 venue, schedule, ticket, source 필드가 포함되어 있으므로 DTO 변경 불필요.

### 아티스트 라인업

기존 엔드포인트 활용:
- `PUT /performances/:id/artists` — 전체 교체
- `DELETE /performances/:id/artists/:artistEntryId` — 개별 삭제

## 6. 삭제

- 확인 다이얼로그: "정말 삭제하시겠습니까?" + 공연 제목 표시
- `api.performances.delete(id)` 호출
- Prisma `onDelete: Cascade`로 관련 데이터 자동 삭제 (source, schedule, ticket, artist)
- 삭제 후 `/performances` 목록으로 리다이렉트

## 7. Admin 클라이언트 API

기존 `api.ts`에 이미 필요한 메서드 존재:
- `performances.get(id)` — 상세 조회
- `performances.delete(id)` — 삭제

추가 필요:
- `performances.update(id, data)` — 수정

```typescript
update: (id: string, data: Record<string, unknown>) =>
  request<Performance>(`/performances/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
```

## 변경 파일 요약

### 서버
- `performance.service.ts` — update 메서드 확장 (venue upsert, schedule/ticket replace)

### Admin
- `lib/api.ts` — `performances.update` 메서드 추가
- `app/performances/page.tsx` — 카드에 링크 추가
- `app/performances/components/performance-form.tsx` — 새 파일, 공통 폼 컴포넌트
- `app/performances/new/page.tsx` — 폼 컴포넌트 사용하도록 리팩터
- `app/performances/[id]/page.tsx` — 새 파일, 상세 페이지
- `app/performances/[id]/edit/page.tsx` — 새 파일, 수정 페이지

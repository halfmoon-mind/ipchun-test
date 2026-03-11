# Mobile Design System Spec

## Overview

ipchun 모바일 앱 전용 디자인 시스템. Tamagui 기반, Apple 미니멀리즘 철학, HCI 원칙 준수.

## Decisions

- **Scope**: 모바일 앱(React Native Expo) 전용
- **Base Library**: Tamagui (테마 + 토큰 중심, 기본 컴포넌트 활용)
- **Visual Direction**: 다크 모드 기본 + 라이트 모드 지원
- **Primary Color**: Amber/Gold (#F5A623)
- **Font**: Pretendard
- **Location**: `apps/mobile/src/design-system/`
- **Approach**: Tamagui 기본 컴포넌트 활용, 필요시만 래퍼 추가

## Design Philosophy

> "골드는 보석처럼 아껴 쓴다."
> UI의 95%는 뉴트럴. 골드는 CTA, 활성 상태, 핵심 강조에만 사용.
> 여백이 곧 콘텐츠. 요소 사이의 호흡이 고급감을 만든다.

## Directory Structure

```
apps/mobile/src/design-system/
├── tamagui.config.ts    # createTamagui 설정 (토큰 + 테마)
├── tokens.ts            # 색상, 타이포, 스페이싱, 라디우스 토큰
├── themes.ts            # 다크/라이트 테마 정의
└── index.ts             # 통합 export
```

## Design Tokens

### Colors — Background Layers (Apple Dark Mode)

| Token | Value | Usage |
|-------|-------|-------|
| `$bg` | `#000000` | OLED 기본 배경 |
| `$bgElevated` | `#1C1C1E` | 카드, 시트, 떠있는 표면 |
| `$bgNested` | `#2C2C2E` | 표면 위의 중첩 요소 |

### Colors — Text (Opacity-based Hierarchy)

| Token | Value | Usage |
|-------|-------|-------|
| `$textPrimary` | `rgba(255,255,255, 0.92)` | 제목, 핵심 텍스트 |
| `$textSecondary` | `rgba(255,255,255, 0.60)` | 보조 설명, 부제 |
| `$textTertiary` | `rgba(255,255,255, 0.32)` | 플레이스홀더, 비활성 |

### Colors — Accent (Gold)

| Token | Value | Usage |
|-------|-------|-------|
| `$accent` | `#F5A623` | CTA 버튼, 활성 탭, 핵심 강조 |
| `$accentSubtle` | `rgba(245,166,35, 0.14)` | 선택된 항목 배경, 뱃지 배경 |
| `$accentPressed` | `#D48E1F` | 버튼 누름 상태 |
| `$accentDisabled` | `rgba(245,166,35, 0.32)` | 비활성 상태 |

### Colors — Interactive Surface States

| Token | Value | Usage |
|-------|-------|-------|
| `$surfacePressed` | `rgba(255,255,255, 0.06)` | 리스트 아이템 누름 |
| `$surfaceHover` | `rgba(255,255,255, 0.04)` | 포커스/호버 |

### Colors — Separators

| Token | Value | Usage |
|-------|-------|-------|
| `$separator` | `rgba(255,255,255, 0.08)` | 리스트 디바이더 |
| `$separatorOpaque` | `#38383A` | 불투명 경계 |

### Colors — Semantic

| Token | Value | Usage |
|-------|-------|-------|
| `$negative` | `#FF453A` | 오류, 삭제 |
| `$positive` | `#30D158` | 성공, 완료 |
| `$warning` | `#FFD60A` | 경고, 주의 |

### Typography (Pretendard, Apple HIG)

| Token | Size | Weight | Usage |
|-------|------|--------|-------|
| `$largeTitle` | 34px | Bold | 페이지 최상단 제목 |
| `$title` | 22px | Bold | 섹션 제목 |
| `$headline` | 17px | SemiBold | 카드 제목, 강조 |
| `$body` | 17px | Regular | 본문 텍스트 |
| `$subhead` | 15px | Regular | 보조 텍스트 |
| `$caption` | 13px | Regular | 메타데이터, 타임스탬프 |

### Spacing (8pt grid)

| Token | Value |
|-------|-------|
| `$1` | 4px |
| `$2` | 8px |
| `$3` | 12px |
| `$4` | 16px |
| `$5` | 20px |
| `$6` | 24px |
| `$8` | 32px |
| `$10` | 40px |
| `$12` | 48px |
| `$16` | 64px |

### Radius (Apple-style, generous)

| Token | Value | Usage |
|-------|-------|-------|
| `$sm` | 8px | 칩, 작은 버튼 |
| `$md` | 12px | 입력 필드, 일반 카드 |
| `$lg` | 16px | 큰 카드, 이미지 |
| `$xl` | 20px | 바텀시트, 모달 |
| `$full` | 9999px | 원형 아바타, 알약 버튼 |

### Size (Touch Targets — Fitts's Law)

| Token | Value | Usage |
|-------|-------|-------|
| `$touchMinHeight` | 44px | Apple HIG 최소 터치 영역 |
| `$buttonHeight` | 50px | 주요 CTA 버튼 |
| `$inputHeight` | 48px | 텍스트 입력 필드 |

### Motion

| Token | Value | Usage |
|-------|-------|-------|
| `$durationFast` | 150ms | 버튼 프레스, 토글 |
| `$durationNormal` | 300ms | 화면 전환, 카드 확장 |
| `$durationSlow` | 500ms | 모달 등장, 복잡한 전환 |
| `$easing` | `cubic-bezier(0.25, 0.1, 0.25, 1)` | Apple 기본 이징 커브 |

## Light Mode Theme

다크 모드 토큰의 라이트 모드 대응:

| Token | Dark | Light |
|-------|------|-------|
| `$bg` | `#000000` | `#FFFFFF` |
| `$bgElevated` | `#1C1C1E` | `#F2F2F7` |
| `$bgNested` | `#2C2C2E` | `#E5E5EA` |
| `$textPrimary` | `rgba(255,255,255, 0.92)` | `rgba(0,0,0, 0.88)` |
| `$textSecondary` | `rgba(255,255,255, 0.60)` | `rgba(0,0,0, 0.56)` |
| `$textTertiary` | `rgba(255,255,255, 0.32)` | `rgba(0,0,0, 0.28)` |
| `$accent` | `#F5A623` | `#D4910E` |
| `$separator` | `rgba(255,255,255, 0.08)` | `rgba(0,0,0, 0.08)` |
| `$surfacePressed` | `rgba(255,255,255, 0.06)` | `rgba(0,0,0, 0.04)` |

## Component Strategy

Tamagui 기본 컴포넌트(`Button`, `Text`, `Input`, `Card`, `Sheet`, `XStack`, `YStack`)를 직접 사용하되, `tamagui.config.ts`의 테마/토큰으로 스타일링.

커스텀 래퍼가 필요한 경우:
- 동일한 prop 조합이 3회 이상 반복될 때만 래퍼 생성
- `apps/mobile/src/design-system/components/`에 배치

## Accessibility

- WCAG AA 대비율 기준 충족 (4.5:1 이상, 대형 텍스트 3:1)
- 최소 터치 영역 44px 보장
- 시맨틱 색상으로 상태 전달 (색상만으로 정보 전달하지 않음)

## Integration

기존 화면(Home, Artists, Schedules)의 인라인 StyleSheet를 Tamagui 컴포넌트 + 토큰으로 교체.

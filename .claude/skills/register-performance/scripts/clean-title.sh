#!/usr/bin/env bash
# clean-title.sh — 공연 제목에서 비-아티스트 패턴을 결정적으로 제거한다.
# 용도: 아티스트 식별 전에 제목을 전처리하여 오인을 방지.
#
# 사용법:
#   bash clean-title.sh "극아타의 극단적인 중개소 Vol.1 (For. 나비야 사랑해)"
#   → 극아타의 극단적인 중개소 Vol.1
#
# 제거 대상 (아티스트가 아닌 요소):
#   - (For. X)    — 자선/기부 대상
#   - (at X)      — 장소
#   - (in X)      — 도시/장소 (단, "In Seoul" 등 괄호 밖은 유지)
#   - (presented by X), (powered by X) — 스폰서
#   (스폰서 접두사는 제거하지 않음 — Claude가 맥락으로 아티스트 판단 가능)
#
# 유지 대상 (아티스트일 수 있는 요소):
#   - (Feat. X), (ft. X)  — 피처링
#   - (with X)             — 협연
#   - [X], 〈X〉            — 유지 (맥락 판단은 Claude 몫)

set -euo pipefail

title="${1:-}"
if [[ -z "$title" ]]; then
  echo ""
  exit 0
fi

cleaned="$title"

# 1. (For. X), (for. X), (FOR X) — 자선/기부 대상 제거
cleaned=$(echo "$cleaned" | sed -E 's/\([Ff][Oo][Rr][.]?[[:space:]]+[^)]+\)//g')

# 2. (at X), (in X) — 장소 제거 (괄호 안만)
cleaned=$(echo "$cleaned" | sed -E 's/\([Aa][Tt][[:space:]]+[^)]+\)//g')
cleaned=$(echo "$cleaned" | sed -E 's/\([Ii][Nn][[:space:]]+[^)]+\)//g')

# 3. (presented by X), (powered by X) — 스폰서 제거
cleaned=$(echo "$cleaned" | sed -E 's/\([Pp]resented[[:space:]]+[Bb]y[[:space:]]+[^)]+\)//g')
cleaned=$(echo "$cleaned" | sed -E 's/\([Pp]owered[[:space:]]+[Bb]y[[:space:]]+[^)]+\)//g')

# 4. 앞뒤 공백 정리
cleaned=$(echo "$cleaned" | sed -E 's/[[:space:]]+/ /g; s/^ //; s/ $//')

echo "$cleaned"

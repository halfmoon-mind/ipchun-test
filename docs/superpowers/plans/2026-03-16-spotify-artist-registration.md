# Spotify 스크래핑 기반 아티스트 등록 개선 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 어드민에서 Spotify URL을 붙여넣으면 아티스트 정보(이름, 이미지, 팔로워, 월간 청취자)가 자동으로 채워지도록 개선. API 키 없이 스크래핑 방식 사용. genre 필드 제거.

**Architecture:** Next.js Route Handler(`app/api/spotify/route.ts`)에서 Spotify 웹페이지를 fetch하여 JSON-LD + base64 인코딩된 스크립트에서 데이터를 파싱. NestJS 서버 수정 없이 어드민 앱 내에서 완결.

**Tech Stack:** Next.js Route Handler, Prisma, HTML 파싱 (regex)

---

## Changes

### DB Schema
- Artist 모델: `genre` 제거, `spotifyId`, `spotifyUrl`, `monthlyListeners`, `followers` 추가

### Files
| 파일 | 변경 |
|------|------|
| `apps/server/prisma/schema.prisma` | Artist 모델 수정 |
| `packages/shared/src/index.ts` | Artist 타입 수정 |
| `apps/server/src/artist/dto/create-artist.dto.ts` | genre 제거, 새 필드 추가 |
| `apps/admin/src/app/api/spotify/route.ts` | 신규 - 스크래핑 Route Handler |
| `apps/admin/src/lib/api.ts` | spotify 함수 추가 |
| `apps/admin/src/app/artists/new/page.tsx` | 폼 전면 교체 |

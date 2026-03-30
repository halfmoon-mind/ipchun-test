import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { CONFIG, type Platform, PLATFORMS } from './config.js';

interface History {
  [platform: string]: {
    tried: string[];
    valid: string[];
    failed: string[];
  };
}

function loadJson<T>(path: string, fallback: T): T {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function saveHistory(history: History): void {
  const dir = CONFIG.dataDir;
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(CONFIG.historyPath, JSON.stringify(history, null, 2));
}

export function loadHistory(): History {
  const empty: History = {};
  for (const p of PLATFORMS) {
    empty[p] = { tried: [], valid: [], failed: [] };
  }
  const loaded = loadJson<History>(CONFIG.historyPath, empty);
  // 누락된 플랫폼 키 보정
  for (const p of PLATFORMS) {
    if (!loaded[p]) loaded[p] = { tried: [], valid: [], failed: [] };
  }
  return loaded;
}

/**
 * 주어진 플랫폼에서 미시도 ID를 count개 반환.
 * 1. 시드 중 미시도 → 2. 유효 ID 인접(±adjacentRange) 중 미시도 → 3. 시드 인접
 */
export function pickIds(
  platform: Platform,
  count: number,
  history: History,
): string[] {
  const seeds: Record<string, string[]> = loadJson(CONFIG.seedsPath, {});
  const platformSeeds = seeds[platform] || [];
  const tried = new Set(history[platform].tried);
  const validIds = history[platform].valid;
  const result: string[] = [];

  // 1단계: 시드 중 미시도
  for (const id of platformSeeds) {
    if (result.length >= count) break;
    if (!tried.has(id)) result.push(id);
  }

  // 2단계: 유효 ID 인접 탐색
  const baseIds = validIds.length > 0 ? validIds : platformSeeds;
  const range = CONFIG.adjacentRange;
  const candidates: string[] = [];
  for (const baseId of baseIds) {
    const num = parseInt(baseId, 10);
    if (isNaN(num)) continue;
    for (let offset = -range; offset <= range; offset++) {
      const candidate = String(num + offset);
      if (!tried.has(candidate) && !result.includes(candidate)) {
        candidates.push(candidate);
      }
    }
  }

  // 셔플 후 필요한 만큼 채우기
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  for (const c of candidates) {
    if (result.length >= count) break;
    result.push(c);
  }

  return result;
}

export function markTried(history: History, platform: Platform, id: string): void {
  if (!history[platform].tried.includes(id)) {
    history[platform].tried.push(id);
  }
}

export function markValid(history: History, platform: Platform, id: string): void {
  if (!history[platform].valid.includes(id)) {
    history[platform].valid.push(id);
  }
}

export function markFailed(history: History, platform: Platform, id: string): void {
  if (!history[platform].failed.includes(id)) {
    history[platform].failed.push(id);
  }
  // retry-failures 성공 시 제거할 수 있도록 valid에서는 유지
}

export function removeFailed(history: History, platform: Platform, id: string): void {
  history[platform].failed = history[platform].failed.filter((f) => f !== id);
}

export { saveHistory };

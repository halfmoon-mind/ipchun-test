interface ExtractionSources {
  /** 구조화 데이터에서 이미 추출된 아티스트 이름 (JSON-LD performer, bizInfo 등) */
  performers?: string[];
}

/**
 * 공연 제목과 구조화 데이터에서 아티스트 이름 후보를 추출한다.
 * 구조화 데이터를 우선하고, 제목 정규식을 보조로 사용한다.
 */
export function extractArtistNames(
  title: string,
  sources?: ExtractionSources,
): string[] {
  const names = new Set<string>();

  // 1) 구조화 데이터
  if (sources?.performers) {
    for (const p of sources.performers) {
      const trimmed = p.trim();
      if (trimmed) names.add(trimmed);
    }
  }

  // 2) 대괄호 패턴: [아티스트]
  const bracketRe = /\[([^\]]+)\]/g;
  let match: RegExpExecArray | null;
  while ((match = bracketRe.exec(title)) !== null) {
    const name = match[1].trim();
    if (name) names.add(name);
  }

  // 3) 키워드 앞 아티스트 추출
  //    대괄호 부분을 제거한 제목에서 매칭 (대괄호는 위에서 이미 처리)
  const titleWithoutBrackets = title.replace(/\[[^\]]*\]/g, '').trim();
  const keywordRe =
    /(?:(?:^|[\s])(\d{4})\s+)?(.+?)\s+(?:단독\s*공연|단독\s*콘서트|콘서트|내한\s*공연|내한\s*콘서트|전국\s*투어|라이브|소극장\s*공연|소극장\s*콘서트|앵콜\s*콘서트|팬미팅)/;
  const keywordMatch = titleWithoutBrackets.match(keywordRe);
  if (keywordMatch) {
    let candidate = keywordMatch[2].trim();
    // 연도 접두사 제거 (맨 앞의 "2025 " 등)
    candidate = candidate.replace(/^\d{4}\s+/, '');
    // 기획공연명/장소명 접두사 제거 (흔한 패턴)
    candidate = candidate.replace(/^.*?기획공연\s*/, '');
    if (candidate) names.add(candidate);
  }

  return [...names];
}

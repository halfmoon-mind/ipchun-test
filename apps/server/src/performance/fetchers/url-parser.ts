export enum TicketPlatformEnum {
  MELON = 'MELON',
  NOL = 'NOL',
  TICKETLINK = 'TICKETLINK',
}

export interface ParsedTicketUrl {
  platform: TicketPlatformEnum;
  externalId: string;
  sourceUrl: string;
}

export function parseTicketUrl(url: string): ParsedTicketUrl {
  // 멜론 티켓: ticket.melon.com/performance/index.htm?prodId={id}
  const melonMatch = url.match(
    /ticket\.melon\.com\/performance\/.*[?&]prodId=(\d+)/,
  );
  if (melonMatch) {
    return {
      platform: TicketPlatformEnum.MELON,
      externalId: melonMatch[1],
      sourceUrl: url,
    };
  }

  // NOL (인터파크): tickets.interpark.com/goods/{id}
  const nolMatch = url.match(
    /(?:tickets?\.)?interpark\.com\/(?:goods|ticket)\/(\d+)/,
  );
  if (nolMatch) {
    return {
      platform: TicketPlatformEnum.NOL,
      externalId: nolMatch[1],
      sourceUrl: url,
    };
  }

  // 티켓링크: ticketlink.co.kr/product/{id}
  const ticketlinkMatch = url.match(/ticketlink\.co\.kr\/product\/(\d+)/);
  if (ticketlinkMatch) {
    return {
      platform: TicketPlatformEnum.TICKETLINK,
      externalId: ticketlinkMatch[1],
      sourceUrl: url,
    };
  }

  throw new Error(`지원하지 않는 URL 형식입니다: ${url}`);
}

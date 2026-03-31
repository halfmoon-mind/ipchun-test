export enum Genre {
  CONCERT = 'CONCERT',
  MUSICAL = 'MUSICAL',
  PLAY = 'PLAY',
  CLASSIC = 'CLASSIC',
  FESTIVAL = 'FESTIVAL',
  BUSKING = 'BUSKING',
  RELEASE = 'RELEASE',
  OTHER = 'OTHER',
}

export enum PerformanceStatus {
  SCHEDULED = 'SCHEDULED',
  ON_SALE = 'ON_SALE',
  SOLD_OUT = 'SOLD_OUT',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum TicketPlatform {
  MELON = 'MELON',
  NOL = 'NOL',
  TICKETLINK = 'TICKETLINK',
  YES24 = 'YES24',
}

export enum LineupMode {
  LINEUP = 'LINEUP',
  TIMETABLE = 'TIMETABLE',
}

export interface SpotifyMeta {
  genres: string[];
  popularity: number;
  followers: number;
  images: { url: string; width: number; height: number }[];
  topTracks: {
    name: string;
    previewUrl: string | null;
    popularity: number;
    albumName: string;
    albumImageUrl: string | null;
  }[];
  relatedArtists: {
    name: string;
    spotifyId: string;
    imageUrl: string | null;
    genres: string[];
  }[];
}

export interface Artist {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  socialLinks: Record<string, string> | null;
  spotifyId: string | null;
  spotifyUrl: string | null;
  monthlyListeners: number | null;
  spotifyMeta: SpotifyMeta | null;
  createdAt: string;
  updatedAt: string;
}

export interface Venue {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  website: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Performance {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  genre: Genre;
  ageRating: string | null;
  runtime: number | null;
  intermission: number | null;
  posterUrl: string | null;
  status: PerformanceStatus;
  lineupMode: LineupMode | null;
  venueId: string | null;
  venue: Venue | null;
  organizer: string | null;
  sources: PerformanceSourceItem[];
  schedules: PerformanceScheduleItem[];
  artists: PerformanceArtistItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PerformanceSourceItem {
  id: string;
  platform: TicketPlatform;
  externalId: string;
  sourceUrl: string;
  ticketOpenAt: string | null;
  bookingEndAt: string | null;
  salesStatus: string | null;
  lastSyncedAt: string;
  tickets: TicketItem[];
}

export interface PerformanceScheduleItem {
  id: string;
  dateTime: string;
}

export interface PerformanceArtistItem {
  id: string;
  artistId: string;
  artist?: Artist;
  performanceScheduleId: string | null;
  role: string | null;
  stageName: string | null;
  stage: string | null;
  startTime: string | null;
  endTime: string | null;
  performanceOrder: number | null;
}

export interface TicketItem {
  id: string;
  seatGrade: string;
  price: number;
}

export interface FetchedPerformance {
  title: string;
  subtitle: string | null;
  genre: Genre;
  ageRating: string | null;
  runtime: number | null;
  intermission: number | null;
  posterUrl: string | null;
  venue: {
    name: string;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
  organizer: string | null;
  schedules: Array<{ dateTime: string }>;
  tickets: Array<{ seatGrade: string; price: number }>;
  source: {
    platform: TicketPlatform;
    externalId: string;
    sourceUrl: string;
    ticketOpenAt: string | null;
    bookingEndAt: string | null;
    salesStatus: string | null;
  };
  /** 티켓 페이지에서 추출한 아티스트 이름 후보 (추천용, 자동 연결 아님) */
  artistNames: string[];
}

export interface AttendanceDto {
  performanceId: string;
  date: string;
  checkedAt: string;
}

export interface BookmarkDto {
  performanceArtistId: string;
  checkedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
}

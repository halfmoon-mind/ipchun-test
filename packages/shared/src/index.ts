export enum ScheduleType {
  CONCERT = 'CONCERT',
  BUSKING = 'BUSKING',
  FESTIVAL = 'FESTIVAL',
  RELEASE = 'RELEASE',
  OTHER = 'OTHER',
}

export enum CardNewsStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
}

export enum Genre {
  CONCERT = 'CONCERT',
  MUSICAL = 'MUSICAL',
  PLAY = 'PLAY',
  CLASSIC = 'CLASSIC',
  FESTIVAL = 'FESTIVAL',
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

export interface Schedule {
  id: string;
  title: string;
  description: string | null;
  type: ScheduleType;
  startDate: string;
  endDate: string | null;
  location: string | null;
  address: string | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CardNews {
  id: string;
  scheduleId: string;
  title: string;
  slides: CardNewsSlide[];
  status: CardNewsStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CardNewsSlide {
  imageUrl: string;
  caption: string;
  order: number;
}

export interface ScheduleLineup {
  id: string;
  scheduleId: string;
  artistId: string;
  stageName: string | null;
  startTime: string | null;
  endTime: string | null;
  performanceOrder: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceDto {
  scheduleId: string;
  date: string;
  checkedAt: string;
}

export interface BookmarkDto {
  scheduleLineupId: string;
  checkedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
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
  genre: Genre;
  ageRating: string | null;
  runtime: number | null;
  intermission: number | null;
  posterUrl: string | null;
  status: PerformanceStatus;
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
  role: string | null;
}

export interface TicketItem {
  id: string;
  seatGrade: string;
  price: number;
}

/** 플랫폼에서 fetch한 결과 (프리뷰용, DB 저장 전) */
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
}

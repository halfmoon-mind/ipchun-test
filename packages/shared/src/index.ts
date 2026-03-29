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

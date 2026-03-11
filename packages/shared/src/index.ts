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

export interface Artist {
  id: string;
  name: string;
  description: string | null;
  genre: string | null;
  imageUrl: string | null;
  socialLinks: Record<string, string> | null;
  createdAt: string;
  updatedAt: string;
}

export interface Schedule {
  id: string;
  artistId: string;
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

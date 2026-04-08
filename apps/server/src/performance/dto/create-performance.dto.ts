import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsNumber,
  IsArray,
  ValidateNested,
  IsNotEmpty,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

enum Genre {
  CONCERT = 'CONCERT',
  MUSICAL = 'MUSICAL',
  PLAY = 'PLAY',
  CLASSIC = 'CLASSIC',
  FESTIVAL = 'FESTIVAL',
  BUSKING = 'BUSKING',
  RELEASE = 'RELEASE',
  TROT = 'TROT',
  OTHER = 'OTHER',
}

enum PerformanceStatus {
  SCHEDULED = 'SCHEDULED',
  ON_SALE = 'ON_SALE',
  SOLD_OUT = 'SOLD_OUT',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

enum TicketPlatform {
  MELON = 'MELON',
  NOL = 'NOL',
  TICKETLINK = 'TICKETLINK',
  YES24 = 'YES24',
}

enum LineupMode {
  LINEUP = 'LINEUP',
  TIMETABLE = 'TIMETABLE',
}

export class ScheduleEntryDto {
  @IsDateString()
  dateTime!: string;
}

export class TicketEntryDto {
  @IsNotEmpty()
  seatGrade!: string;

  @IsInt()
  price!: number;
}

export class CreatePerformanceDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  subtitle?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: Genre, enumName: 'Genre' })
  @IsEnum(Genre)
  genre!: Genre;

  @IsString()
  @IsOptional()
  ageRating?: string;

  @IsInt()
  @IsOptional()
  runtime?: number;

  @IsInt()
  @IsOptional()
  intermission?: number;

  @IsString()
  @IsOptional()
  posterUrl?: string;

  @ApiProperty({ enum: PerformanceStatus, enumName: 'PerformanceStatus' })
  @IsEnum(PerformanceStatus)
  @IsOptional()
  status?: PerformanceStatus;

  @IsString()
  @IsOptional()
  organizer?: string;

  @ApiProperty({ enum: LineupMode, enumName: 'LineupMode' })
  @IsEnum(LineupMode)
  @IsOptional()
  lineupMode?: LineupMode;

  // ── Venue ──
  @IsString()
  @IsOptional()
  venueName?: string;

  @IsString()
  @IsOptional()
  venueAddress?: string;

  @IsNumber()
  @IsOptional()
  venueLatitude?: number;

  @IsNumber()
  @IsOptional()
  venueLongitude?: number;

  // ── Source (optional — not needed for manual entries like BUSKING) ──
  @ApiProperty({ enum: TicketPlatform, enumName: 'TicketPlatform' })
  @IsEnum(TicketPlatform)
  @IsOptional()
  platform?: TicketPlatform;

  @IsString()
  @IsOptional()
  externalId?: string;

  @IsString()
  @IsOptional()
  sourceUrl?: string;

  @IsDateString()
  @IsOptional()
  ticketOpenAt?: string;

  @IsDateString()
  @IsOptional()
  bookingEndAt?: string;

  @IsString()
  @IsOptional()
  salesStatus?: string;

  // ── Schedules ──
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleEntryDto)
  @IsOptional()
  schedules?: ScheduleEntryDto[];

  // ── Tickets ──
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TicketEntryDto)
  @IsOptional()
  tickets?: TicketEntryDto[];
}

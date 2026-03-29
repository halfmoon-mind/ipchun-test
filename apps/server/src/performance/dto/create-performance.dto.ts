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

// DTO 전용 enum (Prisma enum과 값 동일)
enum Genre {
  CONCERT = 'CONCERT',
  MUSICAL = 'MUSICAL',
  PLAY = 'PLAY',
  CLASSIC = 'CLASSIC',
  FESTIVAL = 'FESTIVAL',
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
}

export class ScheduleEntryDto {
  @IsDateString()
  dateTime!: string;
}

export class TicketEntryDto {
  @IsString()
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

  // ── Source ──
  @ApiProperty({ enum: TicketPlatform, enumName: 'TicketPlatform' })
  @IsEnum(TicketPlatform)
  platform!: TicketPlatform;

  @IsString()
  @IsNotEmpty()
  externalId!: string;

  @IsString()
  @IsNotEmpty()
  sourceUrl!: string;

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

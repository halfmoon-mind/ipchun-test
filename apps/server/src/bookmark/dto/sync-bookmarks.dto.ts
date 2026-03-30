import { Type } from 'class-transformer';
import {
  IsUUID,
  IsDateString,
  IsArray,
  ValidateNested,
  IsOptional,
} from 'class-validator';

export class BookmarkItemDto {
  @IsUUID()
  performanceArtistId!: string;

  @IsDateString()
  checkedAt!: string;
}

export class BookmarkRemovalDto {
  @IsUUID()
  performanceArtistId!: string;

  @IsDateString()
  removedAt!: string;
}

export class SyncBookmarksDto {
  @IsUUID()
  performanceId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookmarkItemDto)
  bookmarks!: BookmarkItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookmarkRemovalDto)
  @IsOptional()
  removals?: BookmarkRemovalDto[];
}

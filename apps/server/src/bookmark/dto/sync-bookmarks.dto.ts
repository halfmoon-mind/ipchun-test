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
  lineupId!: string;

  @IsDateString()
  checkedAt!: string;
}

export class BookmarkRemovalDto {
  @IsUUID()
  lineupId!: string;

  @IsDateString()
  removedAt!: string;
}

export class SyncBookmarksDto {
  @IsUUID()
  scheduleId!: string;

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

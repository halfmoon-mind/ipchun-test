import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';

export class ArtistEntryDto {
  @IsUUID()
  artistId!: string;

  @IsString()
  @IsOptional()
  role?: string;

  @IsString()
  @IsOptional()
  stageName?: string;

  @IsString()
  @IsOptional()
  startTime?: string;

  @IsString()
  @IsOptional()
  endTime?: string;

  @IsInt()
  @IsOptional()
  performanceOrder?: number;
}

export class ReplaceArtistsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ArtistEntryDto)
  artists!: ArtistEntryDto[];
}

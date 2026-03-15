import { IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class FindSchedulesQueryDto {
  @IsOptional()
  @IsUUID()
  artistId?: string;

  @IsOptional()
  @IsIn(['upcoming', 'past'])
  period?: 'upcoming' | 'past';

  @IsOptional()
  @IsUUID()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

import { IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class FindSchedulesQueryDto {
  @IsOptional()
  @IsUUID()
  artistId?: string;

  @ApiProperty({ enum: ['upcoming', 'past'], required: false })
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

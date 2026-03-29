import { IsString, IsOptional, IsEnum, IsDateString, IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ScheduleType } from '@ipchun/shared';

export class CreateScheduleDto {
  @IsOptional()
  @IsUUID()
  artistId?: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: ScheduleType, enumName: 'ScheduleType' })
  @IsEnum(ScheduleType)
  type!: ScheduleType;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;
}

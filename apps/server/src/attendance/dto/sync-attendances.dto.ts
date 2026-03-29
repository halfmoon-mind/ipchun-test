import { Type } from 'class-transformer';
import {
  IsUUID,
  IsDateString,
  IsArray,
  ValidateNested,
  IsOptional,
} from 'class-validator';

export class AttendanceItemDto {
  @IsDateString()
  date!: string;

  @IsDateString()
  checkedAt!: string;
}

export class AttendanceRemovalDto {
  @IsDateString()
  date!: string;

  @IsDateString()
  removedAt!: string;
}

export class SyncAttendancesDto {
  @IsUUID()
  performanceId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceItemDto)
  attendances!: AttendanceItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceRemovalDto)
  @IsOptional()
  removals?: AttendanceRemovalDto[];
}

import { IsDateString } from 'class-validator';

export class ToggleAttendanceDto {
  @IsDateString()
  checkedAt!: string;
}

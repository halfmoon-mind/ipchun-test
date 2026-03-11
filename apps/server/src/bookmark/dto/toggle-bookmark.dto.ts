import { IsDateString } from 'class-validator';

export class ToggleBookmarkDto {
  @IsDateString()
  checkedAt!: string;
}

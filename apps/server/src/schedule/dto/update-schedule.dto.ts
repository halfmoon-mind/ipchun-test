import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateScheduleDto } from './create-schedule.dto';

export class UpdateScheduleDto extends PartialType(
  OmitType(CreateScheduleDto, ['artistId'] as const),
) {}

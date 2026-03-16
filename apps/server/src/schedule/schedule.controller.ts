import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Put,
} from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { ReplaceLineupsDto } from './dto/replace-lineups.dto';
import { CalendarQueryDto } from './dto/calendar-query.dto';
import { FindSchedulesQueryDto } from './dto/find-schedules-query.dto';

@Controller('schedules')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Post()
  create(@Body() dto: CreateScheduleDto) {
    return this.scheduleService.create(dto);
  }

  @Get('calendar')
  getCalendar(@Query() query: CalendarQueryDto) {
    return this.scheduleService.findCalendar({
      year: query.year,
      month: query.month,
      artistId: query.artistId,
    });
  }

  @Get()
  findAll(@Query() query: FindSchedulesQueryDto) {
    if (query.artistId) {
      return this.scheduleService.findByArtist(query.artistId, {
        period: query.period,
        cursor: query.cursor,
        limit: query.limit,
      });
    }
    return this.scheduleService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.scheduleService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateScheduleDto) {
    return this.scheduleService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.scheduleService.remove(id);
  }

  @Put(':id/lineups')
  replaceLineups(@Param('id') id: string, @Body() dto: ReplaceLineupsDto) {
    return this.scheduleService.replaceLineups(id, dto.lineups);
  }

  @Delete(':id/lineups/:lineupId')
  removeLineup(@Param('id') id: string, @Param('lineupId') lineupId: string) {
    return this.scheduleService.removeLineup(id, lineupId);
  }
}

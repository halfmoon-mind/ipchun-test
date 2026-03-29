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
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ScheduleService } from './schedule.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { ReplaceLineupsDto } from './dto/replace-lineups.dto';
import { CalendarQueryDto } from './dto/calendar-query.dto';
import { FindSchedulesQueryDto } from './dto/find-schedules-query.dto';

@ApiTags('Schedules')
@Controller('schedules')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Post()
  @ApiOperation({ summary: '스케줄 생성' })
  create(@Body() dto: CreateScheduleDto) {
    return this.scheduleService.create(dto);
  }

  @Get('calendar')
  @ApiOperation({ summary: '캘린더 조회 (월별)' })
  getCalendar(@Query() query: CalendarQueryDto) {
    return this.scheduleService.findCalendar({
      year: query.year,
      month: query.month,
      artistId: query.artistId,
    });
  }

  @Get()
  @ApiOperation({ summary: '스케줄 목록 조회' })
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
  @ApiOperation({ summary: '스케줄 상세 조회' })
  findOne(@Param('id') id: string) {
    return this.scheduleService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '스케줄 수정' })
  update(@Param('id') id: string, @Body() dto: UpdateScheduleDto) {
    return this.scheduleService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '스케줄 삭제' })
  remove(@Param('id') id: string) {
    return this.scheduleService.remove(id);
  }

  @Put(':id/lineups')
  @ApiOperation({ summary: '스케줄 라인업 전체 교체' })
  replaceLineups(@Param('id') id: string, @Body() dto: ReplaceLineupsDto) {
    return this.scheduleService.replaceLineups(id, dto.lineups);
  }

  @Delete(':id/lineups/:lineupId')
  @ApiOperation({ summary: '스케줄 라인업 개별 삭제' })
  removeLineup(@Param('id') id: string, @Param('lineupId') lineupId: string) {
    return this.scheduleService.removeLineup(id, lineupId);
  }
}

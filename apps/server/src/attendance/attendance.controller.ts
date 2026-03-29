import { Controller, Get, Put, Param, Body, Query, Headers, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { SyncAttendancesDto } from './dto/sync-attendances.dto';
import { ToggleAttendanceDto } from './dto/toggle-attendance.dto';

@ApiTags('Attendances')
@ApiHeader({ name: 'x-user-id', required: true, description: '사용자 식별자 (UUID)' })
@Controller('attendances')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  private getUserId(headers: Record<string, string>): string {
    const userId = headers['x-user-id'];
    if (!userId) throw new BadRequestException('x-user-id header is required');
    return userId;
  }

  @Get()
  @ApiOperation({ summary: '출석 기록 조회' })
  @ApiQuery({ name: 'scheduleId', required: true, description: '스케줄 ID (UUID)' })
  async findAll(
    @Headers() headers: Record<string, string>,
    @Query('scheduleId') scheduleId: string,
  ) {
    const userId = this.getUserId(headers);
    if (!scheduleId) throw new BadRequestException('scheduleId query parameter is required');
    const records = await this.attendanceService.findBySchedule(userId, scheduleId);
    return {
      attendances: records.map((r) => ({
        scheduleId: r.scheduleId,
        date: r.date.toISOString().split('T')[0],
        checkedAt: r.checkedAt.toISOString(),
      })),
    };
  }

  @Put('sync')
  @ApiOperation({ summary: '출석 데이터 동기화' })
  async sync(
    @Headers() headers: Record<string, string>,
    @Body() dto: SyncAttendancesDto,
  ) {
    const userId = this.getUserId(headers);
    return this.attendanceService.sync(userId, dto);
  }

  @Put(':scheduleId/:date')
  @ApiOperation({ summary: '출석 토글 (특정 날짜)' })
  async toggle(
    @Headers() headers: Record<string, string>,
    @Param('scheduleId') scheduleId: string,
    @Param('date') date: string,
    @Body() dto: ToggleAttendanceDto,
  ) {
    const userId = this.getUserId(headers);
    if (isNaN(Date.parse(date))) throw new BadRequestException('Invalid date format. Use YYYY-MM-DD');
    return this.attendanceService.toggle(userId, scheduleId, date, dto.checkedAt);
  }
}

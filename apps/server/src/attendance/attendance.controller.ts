import { Controller, Get, Put, Param, Body, Query, Headers, BadRequestException } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { SyncAttendancesDto } from './dto/sync-attendances.dto';
import { ToggleAttendanceDto } from './dto/toggle-attendance.dto';

@Controller('attendances')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  private getUserId(headers: Record<string, string>): string {
    const userId = headers['x-user-id'];
    if (!userId) throw new BadRequestException('x-user-id header is required');
    return userId;
  }

  @Get()
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
  async sync(
    @Headers() headers: Record<string, string>,
    @Body() dto: SyncAttendancesDto,
  ) {
    const userId = this.getUserId(headers);
    return this.attendanceService.sync(userId, dto);
  }

  @Put(':scheduleId/:date')
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

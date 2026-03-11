import { Controller, Get, Put, Param, Body, Query, Headers, BadRequestException } from '@nestjs/common';
import { BookmarkService } from './bookmark.service';
import { SyncBookmarksDto } from './dto/sync-bookmarks.dto';
import { ToggleBookmarkDto } from './dto/toggle-bookmark.dto';

@Controller('bookmarks')
export class BookmarkController {
  constructor(private readonly bookmarkService: BookmarkService) {}

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
    const records = await this.bookmarkService.findBySchedule(userId, scheduleId);
    return {
      bookmarks: records.map((r) => ({
        scheduleLineupId: r.scheduleLineupId,
        checkedAt: r.checkedAt.toISOString(),
      })),
    };
  }

  @Put('sync')
  async sync(
    @Headers() headers: Record<string, string>,
    @Body() dto: SyncBookmarksDto,
  ) {
    const userId = this.getUserId(headers);
    return this.bookmarkService.sync(userId, dto);
  }

  @Put(':lineupId')
  async toggle(
    @Headers() headers: Record<string, string>,
    @Param('lineupId') lineupId: string,
    @Body() dto: ToggleBookmarkDto,
  ) {
    const userId = this.getUserId(headers);
    return this.bookmarkService.toggle(userId, lineupId, dto.checkedAt);
  }
}

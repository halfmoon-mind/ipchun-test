import { Controller, Get, Put, Param, Body, Query, Headers, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { BookmarkService } from './bookmark.service';
import { SyncBookmarksDto } from './dto/sync-bookmarks.dto';
import { ToggleBookmarkDto } from './dto/toggle-bookmark.dto';

@ApiTags('Bookmarks')
@ApiHeader({ name: 'x-user-id', required: true, description: '사용자 식별자 (UUID)' })
@Controller('bookmarks')
export class BookmarkController {
  constructor(private readonly bookmarkService: BookmarkService) {}

  private getUserId(headers: Record<string, string>): string {
    const userId = headers['x-user-id'];
    if (!userId) throw new BadRequestException('x-user-id header is required');
    return userId;
  }

  @Get()
  @ApiOperation({ summary: '북마크 목록 조회' })
  @ApiQuery({ name: 'performanceId', required: true, description: '공연 ID (UUID)' })
  async findAll(
    @Headers() headers: Record<string, string>,
    @Query('performanceId') performanceId: string,
  ) {
    const userId = this.getUserId(headers);
    if (!performanceId) throw new BadRequestException('performanceId query parameter is required');
    const records = await this.bookmarkService.findByPerformance(userId, performanceId);
    return {
      bookmarks: records.map((r) => ({
        performanceArtistId: r.performanceArtistId,
        checkedAt: r.checkedAt.toISOString(),
      })),
    };
  }

  @Put('sync')
  @ApiOperation({ summary: '북마크 데이터 동기화' })
  async sync(
    @Headers() headers: Record<string, string>,
    @Body() dto: SyncBookmarksDto,
  ) {
    const userId = this.getUserId(headers);
    return this.bookmarkService.sync(userId, dto);
  }

  @Put(':performanceArtistId')
  @ApiOperation({ summary: '북마크 토글' })
  async toggle(
    @Headers() headers: Record<string, string>,
    @Param('performanceArtistId') performanceArtistId: string,
    @Body() dto: ToggleBookmarkDto,
  ) {
    const userId = this.getUserId(headers);
    return this.bookmarkService.toggle(userId, performanceArtistId, dto.checkedAt);
  }
}

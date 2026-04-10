import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Put,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { TicketPlatform } from '@ipchun/shared';
import { PerformanceService } from './performance.service';
import { BatchScanService } from './batch-scan.service';
import { FetchUrlDto } from './dto/fetch-url.dto';
import { CreatePerformanceDto } from './dto/create-performance.dto';
import { UpdatePerformanceDto } from './dto/update-performance.dto';
import { CalendarQueryDto } from './dto/calendar-query.dto';
import { FindPerformancesQueryDto } from './dto/find-performances-query.dto';
import { ReplaceArtistsDto } from './dto/replace-artists.dto';

@ApiTags('performances')
@Controller('performances')
export class PerformanceController {
  constructor(
    private readonly service: PerformanceService,
    private readonly batchScanService: BatchScanService,
  ) {}

  @Post('batch-scan')
  @ApiOperation({ summary: '플랫폼 배치 스캔 수동 트리거 (관리자용)' })
  @ApiQuery({ name: 'platform', enum: TicketPlatform, required: false })
  @ApiQuery({ name: 'count', type: Number, required: false })
  async batchScan(
    @Query('platform') platform?: TicketPlatform,
    @Query('count') count?: string,
  ) {
    const batchSize = count ? parseInt(count, 10) : 30;
    if (platform) {
      return this.batchScanService.scanPlatform(platform, batchSize);
    }
    const results = [];
    for (const p of Object.values(TicketPlatform)) {
      results.push(await this.batchScanService.scanPlatform(p as TicketPlatform, batchSize));
    }
    return results;
  }

  @Get('scan-stats')
  @ApiOperation({ summary: '배치 스캔 통계 (플랫폼별 상태 집계)' })
  getScanStats() {
    return this.batchScanService.getScanStats();
  }

  @Post('fetch')
  @ApiOperation({ summary: 'URL에서 공연 데이터 fetch (프리뷰용)' })
  fetchFromUrl(@Body() dto: FetchUrlDto) {
    return this.service.fetchFromUrl(dto.url, dto.skipDuplicateCheck);
  }

  @Get('calendar')
  @ApiOperation({ summary: '캘린더 조회 (월별)' })
  getCalendar(@Query() query: CalendarQueryDto) {
    return this.service.findCalendar({
      year: query.year,
      month: query.month,
      artistId: query.artistId,
    });
  }

  @Post()
  @ApiOperation({ summary: '공연 생성' })
  create(@Body() dto: CreatePerformanceDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: '공연 목록 조회' })
  findAll(@Query() query: FindPerformancesQueryDto) {
    if (query.artistId) {
      return this.service.findByArtist(query.artistId, {
        period: query.period,
        cursor: query.cursor,
        limit: query.limit,
      });
    }
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '공연 상세' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '공연 수정' })
  update(@Param('id') id: string, @Body() dto: UpdatePerformanceDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '공연 삭제' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Put(':id/artists')
  @ApiOperation({ summary: '공연 아티스트 라인업 전체 교체' })
  replaceArtists(@Param('id') id: string, @Body() dto: ReplaceArtistsDto) {
    return this.service.replaceArtists(id, dto.artists);
  }

  @Delete(':id/artists/:artistEntryId')
  @ApiOperation({ summary: '공연 아티스트 라인업 개별 삭제' })
  removeArtist(@Param('id') id: string, @Param('artistEntryId') artistEntryId: string) {
    return this.service.removeArtist(id, artistEntryId);
  }
}

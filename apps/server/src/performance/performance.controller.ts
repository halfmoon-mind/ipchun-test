import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PerformanceService } from './performance.service';
import { FetchUrlDto } from './dto/fetch-url.dto';
import { CreatePerformanceDto } from './dto/create-performance.dto';

@ApiTags('performances')
@Controller('performances')
export class PerformanceController {
  constructor(private readonly service: PerformanceService) {}

  @Post('fetch')
  @ApiOperation({ summary: 'URL에서 공연 데이터 fetch (프리뷰용)' })
  fetchFromUrl(@Body() dto: FetchUrlDto) {
    return this.service.fetchFromUrl(dto.url);
  }

  @Post()
  @ApiOperation({ summary: '공연 생성' })
  create(@Body() dto: CreatePerformanceDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: '공연 목록' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '공연 상세' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: '공연 삭제' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

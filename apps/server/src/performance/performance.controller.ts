import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PerformanceService } from './performance.service';
import { FetchUrlDto } from './dto/fetch-url.dto';
import { CreatePerformanceDto } from './dto/create-performance.dto';

@ApiTags('performances')
@Controller('performances')
export class PerformanceController {
  constructor(private readonly service: PerformanceService) {}

  /** URL에서 공연 데이터 fetch (프리뷰용) */
  @Post('fetch')
  fetchFromUrl(@Body() dto: FetchUrlDto) {
    return this.service.fetchFromUrl(dto.url);
  }

  /** 공연 생성 */
  @Post()
  create(@Body() dto: CreatePerformanceDto) {
    return this.service.create(dto);
  }

  /** 공연 목록 */
  @Get()
  findAll() {
    return this.service.findAll();
  }

  /** 공연 상세 */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  /** 공연 삭제 */
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

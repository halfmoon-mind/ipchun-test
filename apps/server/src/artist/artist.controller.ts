import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ArtistService } from './artist.service';
import { CreateArtistDto } from './dto/create-artist.dto';
import { UpdateArtistDto } from './dto/update-artist.dto';

@ApiTags('Artists')
@Controller('artists')
export class ArtistController {
  constructor(private readonly artistService: ArtistService) {}

  @Post()
  @ApiOperation({ summary: '아티스트 생성' })
  create(@Body() dto: CreateArtistDto) {
    return this.artistService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: '아티스트 목록 조회' })
  @ApiQuery({ name: 'search', required: false, description: '아티스트 이름 검색' })
  findAll(@Query('search') search?: string) {
    return this.artistService.findAll(search);
  }

  @Get(':id')
  @ApiOperation({ summary: '아티스트 상세 조회' })
  findOne(@Param('id') id: string) {
    return this.artistService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '아티스트 수정' })
  update(@Param('id') id: string, @Body() dto: UpdateArtistDto) {
    return this.artistService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '아티스트 삭제' })
  remove(@Param('id') id: string) {
    return this.artistService.remove(id);
  }
}

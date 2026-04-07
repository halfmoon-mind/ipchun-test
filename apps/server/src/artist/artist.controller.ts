import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { ArtistService } from './artist.service';
import { SpotifyService } from '../spotify/spotify.service';
import { CreateArtistDto } from './dto/create-artist.dto';
import { UpdateArtistDto } from './dto/update-artist.dto';
import { FindOrCreateArtistDto } from './dto/find-or-create-artist.dto';

@ApiTags('Artists')
@Controller('artists')
export class ArtistController {
  constructor(
    private readonly artistService: ArtistService,
    private readonly spotify: SpotifyService,
  ) {}

  @Post('find-or-create')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'DB 검색 → Spotify 매칭 → 아티스트 자동 생성' })
  async findOrCreate(@Body() dto: FindOrCreateArtistDto, @Res() res: Response) {
    const { artist, created } = await this.artistService.findOrCreate(dto.name);
    return res.status(created ? HttpStatus.CREATED : HttpStatus.OK).json(artist);
  }

  @Get('spotify/search')
  @ApiOperation({ summary: 'Spotify 아티스트 검색' })
  @ApiQuery({ name: 'q', required: true, description: '검색어' })
  async spotifySearch(@Query('q') q: string) {
    const artists = await this.spotify.search(q);
    return { artists };
  }

  @Get('spotify/:spotifyId')
  @ApiOperation({ summary: 'Spotify 아티스트 상세 조회' })
  async spotifyDetail(@Param('spotifyId') spotifyId: string) {
    return this.spotify.getArtist(spotifyId);
  }

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

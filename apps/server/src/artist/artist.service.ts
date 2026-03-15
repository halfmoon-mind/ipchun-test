import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateArtistDto } from './dto/create-artist.dto';
import { UpdateArtistDto } from './dto/update-artist.dto';

@Injectable()
export class ArtistService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateArtistDto) {
    if (dto.spotifyId) {
      const existing = await this.prisma.artist.findUnique({
        where: { spotifyId: dto.spotifyId },
      });
      if (existing) {
        throw new ConflictException(`이미 등록된 Spotify 아티스트입니다: ${existing.name}`);
      }
    }
    return this.prisma.artist.create({ data: dto });
  }

  findAll() {
    return this.prisma.artist.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.artist.findUniqueOrThrow({ where: { id } });
  }

  update(id: string, dto: UpdateArtistDto) {
    return this.prisma.artist.update({ where: { id }, data: dto });
  }

  remove(id: string) {
    return this.prisma.artist.delete({ where: { id } });
  }
}

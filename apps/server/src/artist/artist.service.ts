import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateArtistDto } from './dto/create-artist.dto';
import { UpdateArtistDto } from './dto/update-artist.dto';

@Injectable()
export class ArtistService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateArtistDto) {
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

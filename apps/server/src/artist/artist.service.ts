import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SpotifyService } from '../spotify/spotify.service';
import { CreateArtistDto } from './dto/create-artist.dto';
import { UpdateArtistDto } from './dto/update-artist.dto';

@Injectable()
export class ArtistService {
  private readonly logger = new Logger(ArtistService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly spotify: SpotifyService,
  ) {}

  async create(dto: CreateArtistDto) {
    if (dto.spotifyId) {
      const existing = await this.prisma.artist.findUnique({
        where: { spotifyId: dto.spotifyId },
      });
      if (existing) {
        throw new ConflictException({
          message: `이미 등록된 Spotify 아티스트입니다: ${existing.name}`,
          existingArtist: existing,
        });
      }
    }
    return this.prisma.artist.create({ data: dto });
  }

  async findOrCreate(name: string) {
    // 1. DB exact match (case-insensitive)
    const dbResults = await this.prisma.artist.findMany({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    if (dbResults.length > 0) {
      return { artist: dbResults[0], created: false };
    }

    // 2. Spotify search — trust Spotify's ranking (first result is most relevant)
    const spotifyResults = await this.spotify.search(name);
    if (spotifyResults.length > 0) {
      const best = spotifyResults[0];

      // Check if this spotifyId already exists in DB
      const existingBySpotify = await this.prisma.artist.findUnique({
        where: { spotifyId: best.spotifyId },
      });
      if (existingBySpotify) {
        return { artist: existingBySpotify, created: false };
      }

      // Fetch full detail
      const detail = await this.spotify.getArtist(best.spotifyId);
      if (detail) {
        const artist = await this.prisma.artist.create({
          data: {
            name: detail.name,
            imageUrl: detail.imageUrl,
            description: detail.description,
            spotifyId: detail.spotifyId,
            spotifyUrl: detail.spotifyUrl,
            monthlyListeners: detail.monthlyListeners,
            spotifyMeta: detail.spotifyMeta as unknown as any,
            socialLinks: { spotify: detail.spotifyUrl },
          },
        });
        this.logger.log(`Artist created with Spotify data: ${artist.name} (${artist.spotifyId})`);
        return { artist, created: true };
      }
    }

    // 3. Fallback: create with name only
    const artist = await this.prisma.artist.create({
      data: { name },
    });
    this.logger.log(`Artist created without Spotify: ${artist.name}`);
    return { artist, created: true };
  }

  findAll(search?: string) {
    return this.prisma.artist.findMany({
      where: search
        ? { name: { contains: search, mode: 'insensitive' } }
        : undefined,
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

  removeMany(ids: string[]) {
    return this.prisma.artist.deleteMany({
      where: { id: { in: ids } },
    });
  }
}

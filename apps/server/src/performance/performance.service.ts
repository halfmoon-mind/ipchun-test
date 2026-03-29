import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePerformanceDto } from './dto/create-performance.dto';
import { parseTicketUrl } from './fetchers/url-parser';
import { fetchFromNol } from './fetchers/nol.fetcher';
import { fetchFromMelon } from './fetchers/melon.fetcher';
import { fetchFromTicketlink } from './fetchers/ticketlink.fetcher';
import type { FetchedPerformance } from '@ipchun/shared';

const PERFORMANCE_INCLUDE = {
  venue: true,
  sources: {
    include: { tickets: true },
  },
  schedules: {
    orderBy: { dateTime: 'asc' as const },
  },
  artists: {
    include: { artist: true },
  },
};

@Injectable()
export class PerformanceService {
  constructor(private readonly prisma: PrismaService) {}

  async fetchFromUrl(url: string): Promise<FetchedPerformance> {
    const { platform, externalId } = parseTicketUrl(url);

    // 중복 체크
    const existing = await this.prisma.performanceSource.findUnique({
      where: { platform_externalId: { platform, externalId } },
      include: { performance: true },
    });
    if (existing) {
      throw new ConflictException(
        `이미 등록된 공연입니다: "${existing.performance.title}" (${platform} ${externalId})`,
      );
    }

    switch (platform) {
      case 'NOL':
        return fetchFromNol(externalId);
      case 'MELON':
        return fetchFromMelon(externalId);
      case 'TICKETLINK':
        return fetchFromTicketlink(externalId);
      default:
        throw new Error(`지원하지 않는 플랫폼: ${platform}`);
    }
  }

  async create(dto: CreatePerformanceDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1) Venue — findOrCreate
      let venueId: string | null = null;
      if (dto.venueName) {
        const venue = await tx.venue.upsert({
          where: { name: dto.venueName },
          update: {
            address: dto.venueAddress ?? undefined,
            latitude: dto.venueLatitude ?? undefined,
            longitude: dto.venueLongitude ?? undefined,
          },
          create: {
            name: dto.venueName,
            address: dto.venueAddress ?? null,
            latitude: dto.venueLatitude ?? null,
            longitude: dto.venueLongitude ?? null,
          },
        });
        venueId = venue.id;
      }

      // 2) Performance
      const performance = await tx.performance.create({
        data: {
          title: dto.title,
          subtitle: dto.subtitle ?? null,
          genre: dto.genre,
          ageRating: dto.ageRating ?? null,
          runtime: dto.runtime ?? null,
          intermission: dto.intermission ?? null,
          posterUrl: dto.posterUrl ?? null,
          status: dto.status ?? 'SCHEDULED',
          venueId,
          organizer: dto.organizer ?? null,
        },
      });

      // 3) PerformanceSource
      const source = await tx.performanceSource.create({
        data: {
          performanceId: performance.id,
          platform: dto.platform,
          externalId: dto.externalId,
          sourceUrl: dto.sourceUrl,
          ticketOpenAt: dto.ticketOpenAt ? new Date(dto.ticketOpenAt) : null,
          bookingEndAt: dto.bookingEndAt ? new Date(dto.bookingEndAt) : null,
          salesStatus: dto.salesStatus ?? null,
        },
      });

      // 4) Schedules
      if (dto.schedules && dto.schedules.length > 0) {
        await tx.performanceSchedule.createMany({
          data: dto.schedules.map((s) => ({
            performanceId: performance.id,
            dateTime: new Date(s.dateTime),
          })),
          skipDuplicates: true,
        });
      }

      // 5) Tickets
      if (dto.tickets && dto.tickets.length > 0) {
        await tx.ticket.createMany({
          data: dto.tickets.map((t) => ({
            sourceId: source.id,
            seatGrade: t.seatGrade,
            price: t.price,
          })),
        });
      }

      return tx.performance.findUniqueOrThrow({
        where: { id: performance.id },
        include: PERFORMANCE_INCLUDE,
      });
    });
  }

  async findAll() {
    return this.prisma.performance.findMany({
      include: PERFORMANCE_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.performance.findUniqueOrThrow({
      where: { id },
      include: PERFORMANCE_INCLUDE,
    });
  }

  async remove(id: string) {
    return this.prisma.performance.delete({ where: { id } });
  }
}

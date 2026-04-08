import {
  Injectable,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Genre } from '@ipchun/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePerformanceDto } from './dto/create-performance.dto';
import { UpdatePerformanceDto } from './dto/update-performance.dto';
import { parseTicketUrl } from './fetchers/url-parser';
import { fetchFromNol } from './fetchers/nol.fetcher';
import { fetchFromMelon } from './fetchers/melon.fetcher';
import { fetchFromTicketlink } from './fetchers/ticketlink.fetcher';
import { fetchFromYes24 } from './fetchers/yes24.fetcher';
import type { FetchedPerformance } from '@ipchun/shared';

const EXCLUDED_GENRES: Genre[] = [Genre.MUSICAL, Genre.PLAY, Genre.CLASSIC, Genre.TROT];

const EXCLUDED_TITLE_KEYWORDS =
  /야구|축구|농구|배구|스포츠|KBO|KBL|K리그|프로야구|프로축구|프로농구|토크콘서트|토크쇼|강연|세미나|특강|트로트/i;

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
    orderBy: { performanceOrder: 'asc' as const },
  },
};

@Injectable()
export class PerformanceService {
  constructor(private readonly prisma: PrismaService) {}

  async fetchFromUrl(url: string, skipDuplicateCheck = false): Promise<FetchedPerformance> {
    const { platform, externalId } = parseTicketUrl(url);

    if (!skipDuplicateCheck) {
      const existing = await this.prisma.performanceSource.findUnique({
        where: { platform_externalId: { platform, externalId } },
        include: { performance: true },
      });
      if (existing) {
        throw new ConflictException(
          `이미 등록된 공연입니다: "${existing.performance.title}" (${platform} ${externalId})`,
        );
      }
    }

    let result: FetchedPerformance;
    switch (platform) {
      case 'NOL':
        result = await fetchFromNol(externalId);
        break;
      case 'MELON':
        result = await fetchFromMelon(externalId);
        break;
      case 'TICKETLINK':
        result = await fetchFromTicketlink(externalId);
        break;
      case 'YES24':
        result = await fetchFromYes24(externalId);
        break;
      default:
        throw new Error(`지원하지 않는 플랫폼: ${platform}`);
    }

    if (EXCLUDED_GENRES.includes(result.genre as Genre)) {
      throw new BadRequestException(
        `등록 대상이 아닌 장르입니다: ${result.genre} ("${result.title}")`,
      );
    }
    if (EXCLUDED_TITLE_KEYWORDS.test(result.title)) {
      throw new BadRequestException(
        `음악 공연이 아닌 것으로 판단됩니다: "${result.title}"`,
      );
    }

    return result;
  }

  async create(dto: CreatePerformanceDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1) Venue
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
          description: dto.description ?? null,
          genre: dto.genre,
          ageRating: dto.ageRating ?? null,
          runtime: dto.runtime ?? null,
          intermission: dto.intermission ?? null,
          posterUrl: dto.posterUrl ?? null,
          status: dto.status ?? 'SCHEDULED',
          venueId,
          organizer: dto.organizer ?? null,
          lineupMode: dto.lineupMode ?? null,
        },
      });

      // 3) PerformanceSource (optional)
      let sourceId: string | null = null;
      if (dto.platform && dto.externalId && dto.sourceUrl) {
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
        sourceId = source.id;
      }

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
      if (sourceId && dto.tickets && dto.tickets.length > 0) {
        await tx.ticket.createMany({
          data: dto.tickets.map((t) => ({
            sourceId,
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

  findAll() {
    return this.prisma.performance.findMany({
      include: PERFORMANCE_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.performance.findUniqueOrThrow({
      where: { id },
      include: PERFORMANCE_INCLUDE,
    });
  }

  async update(id: string, dto: UpdatePerformanceDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1) Venue
      let venueId: string | null | undefined = undefined;
      if (dto.venueName !== undefined) {
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
        } else {
          venueId = null;
        }
      }

      // 2) Performance
      await tx.performance.update({
        where: { id },
        data: {
          title: dto.title,
          subtitle: dto.subtitle,
          description: dto.description,
          genre: dto.genre,
          ageRating: dto.ageRating,
          runtime: dto.runtime,
          intermission: dto.intermission,
          posterUrl: dto.posterUrl,
          status: dto.status,
          organizer: dto.organizer,
          lineupMode: dto.lineupMode,
          ...(venueId !== undefined && { venueId }),
        },
      });

      // 3) Schedules (replace)
      if (dto.schedules !== undefined) {
        await tx.performanceSchedule.deleteMany({ where: { performanceId: id } });
        if (dto.schedules.length > 0) {
          await tx.performanceSchedule.createMany({
            data: dto.schedules.map((s) => ({
              performanceId: id,
              dateTime: new Date(s.dateTime),
            })),
            skipDuplicates: true,
          });
        }
      }

      // 4) Source & Tickets
      if (dto.platform !== undefined || dto.ticketOpenAt !== undefined || dto.bookingEndAt !== undefined || dto.salesStatus !== undefined) {
        const existingSource = await tx.performanceSource.findFirst({
          where: { performanceId: id },
        });

        if (existingSource) {
          await tx.performanceSource.update({
            where: { id: existingSource.id },
            data: {
              ticketOpenAt: dto.ticketOpenAt ? new Date(dto.ticketOpenAt) : existingSource.ticketOpenAt,
              bookingEndAt: dto.bookingEndAt ? new Date(dto.bookingEndAt) : existingSource.bookingEndAt,
              salesStatus: dto.salesStatus ?? existingSource.salesStatus,
            },
          });

          // Replace tickets if provided
          if (dto.tickets !== undefined) {
            await tx.ticket.deleteMany({ where: { sourceId: existingSource.id } });
            if (dto.tickets.length > 0) {
              await tx.ticket.createMany({
                data: dto.tickets.map((t) => ({
                  sourceId: existingSource.id,
                  seatGrade: t.seatGrade,
                  price: t.price,
                })),
              });
            }
          }
        }
      } else if (dto.tickets !== undefined) {
        // Tickets changed but no source fields — still replace tickets on first source
        const existingSource = await tx.performanceSource.findFirst({
          where: { performanceId: id },
        });
        if (existingSource) {
          await tx.ticket.deleteMany({ where: { sourceId: existingSource.id } });
          if (dto.tickets.length > 0) {
            await tx.ticket.createMany({
              data: dto.tickets.map((t) => ({
                sourceId: existingSource.id,
                seatGrade: t.seatGrade,
                price: t.price,
              })),
            });
          }
        }
      }

      return tx.performance.findUniqueOrThrow({
        where: { id },
        include: PERFORMANCE_INCLUDE,
      });
    });
  }

  remove(id: string) {
    return this.prisma.performance.delete({ where: { id } });
  }

  // ── Calendar ──

  async findCalendar(params: { year: number; month: number; artistId?: string }) {
    const { year, month, artistId } = params;
    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthEnd = new Date(Date.UTC(year, month, 1));

    const performances = await this.prisma.performance.findMany({
      where: {
        schedules: {
          some: {
            dateTime: { gte: monthStart, lt: monthEnd },
          },
        },
        ...(artistId && { artists: { some: { artistId } } }),
      },
      include: PERFORMANCE_INCLUDE,
    });

    // 첫 번째 스케줄 날짜 기준 오름차순 정렬
    performances.sort((a, b) => {
      const aTime = a.schedules[0]?.dateTime ?? '';
      const bTime = b.schedules[0]?.dateTime ?? '';
      return new Date(aTime).getTime() - new Date(bTime).getTime();
    });

    // Build dates map from PerformanceSchedule dateTimes
    const dates: Record<string, string[]> = {};
    for (const perf of performances) {
      for (const sched of perf.schedules) {
        const d = new Date(sched.dateTime);
        if (d >= monthStart && d < monthEnd) {
          // KST (UTC+9) 기준 날짜 키 — toISOString()은 UTC라 자정 공연이 전날로 밀림
          const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
          const key = kst.toISOString().slice(0, 10);
          if (!dates[key]) dates[key] = [];
          if (!dates[key].includes(perf.genre)) {
            dates[key].push(perf.genre);
          }
        }
      }
    }

    return { year, month, performances, dates };
  }

  // ── By Artist ──

  async findByArtist(
    artistId: string,
    options?: { period?: 'upcoming' | 'past'; cursor?: string; limit?: number },
  ) {
    const { period, cursor, limit = 10 } = options ?? {};
    const now = new Date();

    // Schedules are included with orderBy dateTime asc,
    // so schedules[0] is the earliest date for each performance.
    const earliestDate = (p: { schedules: { dateTime: Date }[] }) =>
      p.schedules[0]?.dateTime?.getTime() ?? 0;

    if (!period) {
      const performances = await this.prisma.performance.findMany({
        where: { artists: { some: { artistId } } },
        include: PERFORMANCE_INCLUDE,
      });
      return performances.sort((a, b) => earliestDate(a) - earliestDate(b));
    }

    const isUpcoming = period === 'upcoming';
    const baseWhere = { artists: { some: { artistId } } };

    // Upcoming: at least one schedule dateTime >= now
    // Past: no schedule dateTime >= now (all in the past)
    const scheduleFilter = isUpcoming
      ? { schedules: { some: { dateTime: { gte: now } } } }
      : { schedules: { every: { dateTime: { lt: now } } }, NOT: { schedules: { none: {} } } };

    const performances = await this.prisma.performance.findMany({
      where: { ...baseWhere, ...scheduleFilter },
      include: PERFORMANCE_INCLUDE,
    });

    // Sort by earliest schedule date: upcoming asc (soonest first), past desc (most recent first)
    performances.sort((a, b) =>
      isUpcoming
        ? earliestDate(a) - earliestDate(b)
        : earliestDate(b) - earliestDate(a),
    );

    if (isUpcoming) {
      return { data: performances, nextCursor: null };
    }

    // Cursor-based pagination over the date-sorted list
    let startIndex = 0;
    if (cursor) {
      const idx = performances.findIndex((p) => p.id === cursor);
      if (idx !== -1) startIndex = idx + 1;
    }

    const slice = performances.slice(startIndex, startIndex + limit + 1);
    const hasMore = slice.length > limit;
    const data = hasMore ? slice.slice(0, limit) : slice;
    const nextCursor = hasMore ? data[data.length - 1].id : null;

    return { data, nextCursor };
  }

  // ── Artist Lineup Management ──

  async replaceArtists(
    performanceId: string,
    artists: { artistId: string; role?: string; stageName?: string; startTime?: string; endTime?: string; performanceOrder?: number; stage?: string; performanceScheduleId?: string }[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.performanceArtist.deleteMany({ where: { performanceId } });
      if (artists.length > 0) {
        await tx.performanceArtist.createMany({
          data: artists.map((a) => ({
            performanceId,
            artistId: a.artistId,
            role: a.role ?? null,
            stageName: a.stageName ?? null,
            startTime: a.startTime ? new Date(a.startTime) : null,
            endTime: a.endTime ? new Date(a.endTime) : null,
            performanceOrder: a.performanceOrder ?? null,
            stage: a.stage ?? null,
            performanceScheduleId: a.performanceScheduleId ?? null,
          })),
        });
      }
      return tx.performance.findUniqueOrThrow({
        where: { id: performanceId },
        include: PERFORMANCE_INCLUDE,
      });
    });
  }

  removeArtist(performanceId: string, artistEntryId: string) {
    return this.prisma.performanceArtist.delete({
      where: { id: artistEntryId, performanceId },
    });
  }
}

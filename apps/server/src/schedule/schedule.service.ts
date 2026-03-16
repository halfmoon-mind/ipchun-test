import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

const SCHEDULE_INCLUDE = {
  lineups: {
    include: { artist: true },
    orderBy: { performanceOrder: 'asc' as const },
  },
};

@Injectable()
export class ScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateScheduleDto) {
    const { artistId, ...scheduleData } = dto;
    return this.prisma.$transaction(async (tx) => {
      const schedule = await tx.schedule.create({ data: scheduleData });
      if (artistId) {
        await tx.scheduleLineup.create({
          data: { scheduleId: schedule.id, artistId },
        });
      }
      return tx.schedule.findUniqueOrThrow({
        where: { id: schedule.id },
        include: SCHEDULE_INCLUDE,
      });
    });
  }

  findAll() {
    return this.prisma.schedule.findMany({
      include: SCHEDULE_INCLUDE,
      orderBy: { startDate: 'asc' },
    });
  }

  async findByArtist(
    artistId: string,
    options?: { period?: 'upcoming' | 'past'; cursor?: string; limit?: number },
  ) {
    const { period, cursor, limit = 10 } = options ?? {};

    // No period: return all (backward compatible)
    if (!period) {
      return this.prisma.schedule.findMany({
        where: { lineups: { some: { artistId } } },
        include: SCHEDULE_INCLUDE,
        orderBy: { startDate: 'asc' },
      });
    }

    const now = new Date();
    const isUpcoming = period === 'upcoming';

    const take = isUpcoming ? undefined : limit + 1;
    const baseWhere = { lineups: { some: { artistId } } };

    let where: Record<string, unknown>;

    if (cursor && !isUpcoming) {
      const cursorSchedule = await this.prisma.schedule.findUniqueOrThrow({
        where: { id: cursor },
        select: { startDate: true },
      });
      where = {
        ...baseWhere,
        OR: [
          { startDate: { lt: cursorSchedule.startDate } },
          { startDate: cursorSchedule.startDate, id: { lt: cursor } },
        ],
      };
    } else {
      where = {
        ...baseWhere,
        ...(isUpcoming
          ? { startDate: { gte: now } }
          : { startDate: { lt: now } }),
      };
    }

    const schedules = await this.prisma.schedule.findMany({
      where,
      include: SCHEDULE_INCLUDE,
      orderBy: [{ startDate: isUpcoming ? 'asc' : 'desc' }, { id: isUpcoming ? 'asc' : 'desc' }],
      ...(take && { take }),
    });

    // Upcoming: return all
    if (isUpcoming) {
      return { data: schedules, nextCursor: null };
    }

    // Past: check for next page
    const hasMore = schedules.length > limit;
    const data = hasMore ? schedules.slice(0, limit) : schedules;
    const nextCursor = hasMore ? data[data.length - 1].id : null;

    return { data, nextCursor };
  }

  findOne(id: string) {
    return this.prisma.schedule.findUniqueOrThrow({
      where: { id },
      include: SCHEDULE_INCLUDE,
    });
  }

  update(id: string, dto: UpdateScheduleDto) {
    return this.prisma.schedule.update({
      where: { id },
      data: dto,
      include: SCHEDULE_INCLUDE,
    });
  }

  remove(id: string) {
    return this.prisma.schedule.delete({ where: { id } });
  }

  async findCalendar(params: { year: number; month: number; artistId?: string }) {
    const { year, month, artistId } = params;
    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthEnd = new Date(Date.UTC(year, month, 1));

    const schedules = await this.prisma.schedule.findMany({
      where: {
        OR: [
          { startDate: { gte: monthStart, lt: monthEnd } },
          { endDate: { gte: monthStart, lt: monthEnd } },
          { startDate: { lt: monthStart }, endDate: { gt: monthEnd } },
        ],
        ...(artistId && { lineups: { some: { artistId } } }),
      },
      include: SCHEDULE_INCLUDE,
      orderBy: { startDate: 'asc' },
    });

    // Build dates map
    const dates: Record<string, string[]> = {};
    for (const schedule of schedules) {
      const start = new Date(schedule.startDate);
      const end = schedule.endDate ? new Date(schedule.endDate) : start;

      const dayStart = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
      const dayEnd = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));

      for (let d = new Date(dayStart); d <= dayEnd; d.setUTCDate(d.getUTCDate() + 1)) {
        if (d >= monthStart && d < monthEnd) {
          const key = d.toISOString().slice(0, 10);
          if (!dates[key]) dates[key] = [];
          if (!dates[key].includes(schedule.type)) {
            dates[key].push(schedule.type);
          }
        }
      }
    }

    return { year, month, schedules, dates };
  }

  async replaceLineups(scheduleId: string, lineups: { artistId: string; stageName?: string; startTime?: string; endTime?: string; performanceOrder?: number }[]) {
    return this.prisma.$transaction(async (tx) => {
      await tx.scheduleLineup.deleteMany({ where: { scheduleId } });
      if (lineups.length > 0) {
        await tx.scheduleLineup.createMany({
          data: lineups.map((l) => ({
            scheduleId,
            artistId: l.artistId,
            stageName: l.stageName || null,
            startTime: l.startTime ? new Date(l.startTime) : null,
            endTime: l.endTime ? new Date(l.endTime) : null,
            performanceOrder: l.performanceOrder ?? null,
          })),
        });
      }
      return tx.schedule.findUniqueOrThrow({
        where: { id: scheduleId },
        include: SCHEDULE_INCLUDE,
      });
    });
  }

  removeLineup(scheduleId: string, lineupId: string) {
    return this.prisma.scheduleLineup.delete({
      where: { id: lineupId, scheduleId },
    });
  }
}

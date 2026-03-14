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

  findByArtist(artistId: string) {
    return this.prisma.schedule.findMany({
      where: { lineups: { some: { artistId } } },
      include: SCHEDULE_INCLUDE,
      orderBy: { startDate: 'asc' },
    });
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
}

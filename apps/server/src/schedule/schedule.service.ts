import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

@Injectable()
export class ScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateScheduleDto) {
    return this.prisma.schedule.create({
      data: dto,
      include: { artist: true },
    });
  }

  findAll() {
    return this.prisma.schedule.findMany({
      include: { artist: true },
      orderBy: { startDate: 'asc' },
    });
  }

  findByArtist(artistId: string) {
    return this.prisma.schedule.findMany({
      where: { artistId },
      orderBy: { startDate: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.schedule.findUniqueOrThrow({
      where: { id },
      include: { artist: true },
    });
  }

  update(id: string, dto: UpdateScheduleDto) {
    return this.prisma.schedule.update({
      where: { id },
      data: dto,
      include: { artist: true },
    });
  }

  remove(id: string) {
    return this.prisma.schedule.delete({ where: { id } });
  }
}

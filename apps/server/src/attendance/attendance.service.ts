import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  findByPerformance(userId: string, performanceId: string) {
    return this.prisma.userAttendance.findMany({
      where: { userId, performanceId },
    });
  }

  async toggle(userId: string, performanceId: string, date: string, checkedAt: string) {
    const dateOnly = new Date(date + 'T00:00:00.000Z');
    const existing = await this.prisma.userAttendance.findUnique({
      where: { userId_performanceId_date: { userId, performanceId, date: dateOnly } },
    });

    if (existing) {
      await this.prisma.userAttendance.delete({ where: { id: existing.id } });
      return { attending: false };
    }

    const attendance = await this.prisma.userAttendance.create({
      data: { userId, performanceId, date: dateOnly, checkedAt: new Date(checkedAt) },
    });

    return {
      attending: true,
      attendance: {
        performanceId: attendance.performanceId,
        date: attendance.date.toISOString().split('T')[0],
        checkedAt: attendance.checkedAt.toISOString(),
      },
    };
  }

  async sync(userId: string, dto: { performanceId: string; attendances: { date: string; checkedAt: string }[]; removals?: { date: string; removedAt: string }[] }) {
    const { performanceId, attendances, removals } = dto;

    return this.prisma.$transaction(async (tx) => {
      const serverRecords = await tx.userAttendance.findMany({
        where: { userId, performanceId },
      });
      const serverMap = new Map(
        serverRecords.map((r) => [r.date.toISOString().split('T')[0], r]),
      );

      for (const item of attendances) {
        const dateOnly = new Date(item.date + 'T00:00:00.000Z');
        const serverRecord = serverMap.get(item.date);
        if (!serverRecord || new Date(item.checkedAt) > serverRecord.checkedAt) {
          await tx.userAttendance.upsert({
            where: { userId_performanceId_date: { userId, performanceId, date: dateOnly } },
            update: { checkedAt: new Date(item.checkedAt) },
            create: { userId, performanceId, date: dateOnly, checkedAt: new Date(item.checkedAt) },
          });
        }
      }

      for (const removal of removals ?? []) {
        const serverRecord = serverMap.get(removal.date);
        if (serverRecord && new Date(removal.removedAt) > serverRecord.checkedAt) {
          await tx.userAttendance.delete({
            where: { id: serverRecord.id },
          });
        }
      }

      const finalRecords = await tx.userAttendance.findMany({
        where: { userId, performanceId },
      });

      return {
        attendances: finalRecords.map((r) => ({
          performanceId: r.performanceId,
          date: r.date.toISOString().split('T')[0],
          checkedAt: r.checkedAt.toISOString(),
        })),
      };
    });
  }
}

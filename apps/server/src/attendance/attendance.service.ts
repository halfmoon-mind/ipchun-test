import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  findBySchedule(userId: string, scheduleId: string) {
    return this.prisma.userScheduleAttendance.findMany({
      where: { userId, scheduleId },
    });
  }

  async toggle(userId: string, scheduleId: string, date: string, checkedAt: string) {
    const dateOnly = new Date(date + 'T00:00:00.000Z');
    const existing = await this.prisma.userScheduleAttendance.findUnique({
      where: { userId_scheduleId_date: { userId, scheduleId, date: dateOnly } },
    });

    if (existing) {
      await this.prisma.userScheduleAttendance.delete({ where: { id: existing.id } });
      return { attending: false };
    }

    const attendance = await this.prisma.userScheduleAttendance.create({
      data: { userId, scheduleId, date: dateOnly, checkedAt: new Date(checkedAt) },
    });

    return {
      attending: true,
      attendance: {
        scheduleId: attendance.scheduleId,
        date: attendance.date.toISOString().split('T')[0],
        checkedAt: attendance.checkedAt.toISOString(),
      },
    };
  }

  async sync(userId: string, dto: { scheduleId: string; attendances: { date: string; checkedAt: string }[]; removals?: { date: string; removedAt: string }[] }) {
    const { scheduleId, attendances, removals } = dto;

    return this.prisma.$transaction(async (tx) => {
      const serverRecords = await tx.userScheduleAttendance.findMany({
        where: { userId, scheduleId },
      });
      const serverMap = new Map(
        serverRecords.map((r) => [r.date.toISOString().split('T')[0], r]),
      );

      for (const item of attendances) {
        const dateOnly = new Date(item.date + 'T00:00:00.000Z');
        const serverRecord = serverMap.get(item.date);
        if (!serverRecord || new Date(item.checkedAt) > serverRecord.checkedAt) {
          await tx.userScheduleAttendance.upsert({
            where: { userId_scheduleId_date: { userId, scheduleId, date: dateOnly } },
            update: { checkedAt: new Date(item.checkedAt) },
            create: { userId, scheduleId, date: dateOnly, checkedAt: new Date(item.checkedAt) },
          });
        }
      }

      for (const removal of removals ?? []) {
        const serverRecord = serverMap.get(removal.date);
        if (serverRecord && new Date(removal.removedAt) > serverRecord.checkedAt) {
          await tx.userScheduleAttendance.delete({
            where: { id: serverRecord.id },
          });
        }
      }

      const finalRecords = await tx.userScheduleAttendance.findMany({
        where: { userId, scheduleId },
      });

      return {
        attendances: finalRecords.map((r) => ({
          scheduleId: r.scheduleId,
          date: r.date.toISOString().split('T')[0],
          checkedAt: r.checkedAt.toISOString(),
        })),
      };
    });
  }
}

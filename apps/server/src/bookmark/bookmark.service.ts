import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BookmarkService {
  constructor(private readonly prisma: PrismaService) {}

  async findBySchedule(userId: string, scheduleId: string) {
    const lineups = await this.prisma.scheduleLineup.findMany({
      where: { scheduleId },
      select: { id: true },
    });
    const lineupIds = lineups.map((l) => l.id);

    return this.prisma.userBookmark.findMany({
      where: { userId, scheduleLineupId: { in: lineupIds } },
    });
  }

  async toggle(userId: string, lineupId: string, checkedAt: string) {
    const existing = await this.prisma.userBookmark.findUnique({
      where: { userId_scheduleLineupId: { userId, scheduleLineupId: lineupId } },
    });

    if (existing) {
      await this.prisma.userBookmark.delete({ where: { id: existing.id } });
      return { bookmarked: false };
    }

    const bookmark = await this.prisma.userBookmark.create({
      data: { userId, scheduleLineupId: lineupId, checkedAt: new Date(checkedAt) },
    });

    return {
      bookmarked: true,
      bookmark: {
        scheduleLineupId: bookmark.scheduleLineupId,
        checkedAt: bookmark.checkedAt.toISOString(),
      },
    };
  }

  async sync(userId: string, dto: { scheduleId: string; bookmarks: { lineupId: string; checkedAt: string }[]; removals?: { lineupId: string; removedAt: string }[] }) {
    const { scheduleId, bookmarks, removals } = dto;

    return this.prisma.$transaction(async (tx) => {
      const lineups = await tx.scheduleLineup.findMany({
        where: { scheduleId },
        select: { id: true },
      });
      const lineupIds = lineups.map((l) => l.id);

      const serverRecords = await tx.userBookmark.findMany({
        where: { userId, scheduleLineupId: { in: lineupIds } },
      });
      const serverMap = new Map(
        serverRecords.map((r) => [r.scheduleLineupId, r]),
      );

      for (const item of bookmarks) {
        const serverRecord = serverMap.get(item.lineupId);
        if (!serverRecord || new Date(item.checkedAt) > serverRecord.checkedAt) {
          await tx.userBookmark.upsert({
            where: { userId_scheduleLineupId: { userId, scheduleLineupId: item.lineupId } },
            update: { checkedAt: new Date(item.checkedAt) },
            create: { userId, scheduleLineupId: item.lineupId, checkedAt: new Date(item.checkedAt) },
          });
        }
      }

      for (const removal of removals ?? []) {
        const serverRecord = serverMap.get(removal.lineupId);
        if (serverRecord && new Date(removal.removedAt) > serverRecord.checkedAt) {
          await tx.userBookmark.delete({ where: { id: serverRecord.id } });
        }
      }

      const finalRecords = await tx.userBookmark.findMany({
        where: { userId, scheduleLineupId: { in: lineupIds } },
      });

      return {
        bookmarks: finalRecords.map((r) => ({
          scheduleLineupId: r.scheduleLineupId,
          checkedAt: r.checkedAt.toISOString(),
        })),
      };
    });
  }
}

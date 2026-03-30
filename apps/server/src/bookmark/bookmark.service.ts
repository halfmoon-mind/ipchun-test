import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BookmarkService {
  constructor(private readonly prisma: PrismaService) {}

  async findByPerformance(userId: string, performanceId: string) {
    const artists = await this.prisma.performanceArtist.findMany({
      where: { performanceId },
      select: { id: true },
    });
    const artistIds = artists.map((a) => a.id);

    return this.prisma.userBookmark.findMany({
      where: { userId, performanceArtistId: { in: artistIds } },
    });
  }

  async toggle(userId: string, performanceArtistId: string, checkedAt: string) {
    const existing = await this.prisma.userBookmark.findUnique({
      where: { userId_performanceArtistId: { userId, performanceArtistId } },
    });

    if (existing) {
      await this.prisma.userBookmark.delete({ where: { id: existing.id } });
      return { bookmarked: false };
    }

    const bookmark = await this.prisma.userBookmark.create({
      data: { userId, performanceArtistId, checkedAt: new Date(checkedAt) },
    });

    return {
      bookmarked: true,
      bookmark: {
        performanceArtistId: bookmark.performanceArtistId,
        checkedAt: bookmark.checkedAt.toISOString(),
      },
    };
  }

  async sync(userId: string, dto: { performanceId: string; bookmarks: { performanceArtistId: string; checkedAt: string }[]; removals?: { performanceArtistId: string; removedAt: string }[] }) {
    const { performanceId, bookmarks, removals } = dto;

    return this.prisma.$transaction(async (tx) => {
      const artists = await tx.performanceArtist.findMany({
        where: { performanceId },
        select: { id: true },
      });
      const artistIds = artists.map((a) => a.id);

      const serverRecords = await tx.userBookmark.findMany({
        where: { userId, performanceArtistId: { in: artistIds } },
      });
      const serverMap = new Map(
        serverRecords.map((r) => [r.performanceArtistId, r]),
      );

      for (const item of bookmarks) {
        const serverRecord = serverMap.get(item.performanceArtistId);
        if (!serverRecord || new Date(item.checkedAt) > serverRecord.checkedAt) {
          await tx.userBookmark.upsert({
            where: { userId_performanceArtistId: { userId, performanceArtistId: item.performanceArtistId } },
            update: { checkedAt: new Date(item.checkedAt) },
            create: { userId, performanceArtistId: item.performanceArtistId, checkedAt: new Date(item.checkedAt) },
          });
        }
      }

      for (const removal of removals ?? []) {
        const serverRecord = serverMap.get(removal.performanceArtistId);
        if (serverRecord && new Date(removal.removedAt) > serverRecord.checkedAt) {
          await tx.userBookmark.delete({ where: { id: serverRecord.id } });
        }
      }

      const finalRecords = await tx.userBookmark.findMany({
        where: { userId, performanceArtistId: { in: artistIds } },
      });

      return {
        bookmarks: finalRecords.map((r) => ({
          performanceArtistId: r.performanceArtistId,
          checkedAt: r.checkedAt.toISOString(),
        })),
      };
    });
  }
}

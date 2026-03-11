import { Test, TestingModule } from '@nestjs/testing';
import { BookmarkService } from './bookmark.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  userBookmark: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
  },
  scheduleLineup: {
    findMany: jest.fn(),
  },
  $transaction: jest.fn((fn) => fn(mockPrisma)),
};

describe('BookmarkService', () => {
  let service: BookmarkService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookmarkService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<BookmarkService>(BookmarkService);
    jest.clearAllMocks();
  });

  describe('findBySchedule', () => {
    it('should return bookmarks for lineups in a schedule', async () => {
      mockPrisma.scheduleLineup.findMany.mockResolvedValue([
        { id: 'l1' }, { id: 'l2' },
      ]);
      mockPrisma.userBookmark.findMany.mockResolvedValue([
        { id: 'b1', userId: 'u1', scheduleLineupId: 'l1', checkedAt: new Date() },
      ]);

      const result = await service.findBySchedule('u1', 's1');

      expect(mockPrisma.scheduleLineup.findMany).toHaveBeenCalledWith({
        where: { scheduleId: 's1' },
        select: { id: true },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('toggle', () => {
    it('should create bookmark when not exists', async () => {
      mockPrisma.userBookmark.findUnique.mockResolvedValue(null);
      mockPrisma.userBookmark.create.mockResolvedValue({
        id: 'b1', userId: 'u1', scheduleLineupId: 'l1', checkedAt: new Date(),
      });

      const result = await service.toggle('u1', 'l1', new Date().toISOString());
      expect(result.bookmarked).toBe(true);
    });

    it('should delete bookmark when exists', async () => {
      mockPrisma.userBookmark.findUnique.mockResolvedValue({
        id: 'b1', userId: 'u1', scheduleLineupId: 'l1', checkedAt: new Date(),
      });
      mockPrisma.userBookmark.delete.mockResolvedValue({});

      const result = await service.toggle('u1', 'l1', new Date().toISOString());
      expect(result.bookmarked).toBe(false);
    });
  });

  describe('sync', () => {
    it('should upsert newer bookmarks, delete valid removals, return final state', async () => {
      mockPrisma.scheduleLineup.findMany.mockResolvedValue([{ id: 'l1' }, { id: 'l2' }]);
      mockPrisma.userBookmark.findMany
        .mockResolvedValueOnce([
          { id: 'b1', userId: 'u1', scheduleLineupId: 'l1', checkedAt: new Date('2026-03-11T10:00:00Z') },
        ])
        .mockResolvedValueOnce([
          { id: 'b2', userId: 'u1', scheduleLineupId: 'l2', checkedAt: new Date('2026-03-11T11:00:00Z') },
        ]);
      mockPrisma.userBookmark.upsert.mockResolvedValue({});
      mockPrisma.userBookmark.delete.mockResolvedValue({});

      const result = await service.sync('u1', {
        scheduleId: 's1',
        bookmarks: [{ lineupId: 'l2', checkedAt: '2026-03-11T11:00:00Z' }],
        removals: [{ lineupId: 'l1', removedAt: '2026-03-11T12:00:00Z' }],
      });

      expect(mockPrisma.userBookmark.upsert).toHaveBeenCalled();
      expect(mockPrisma.userBookmark.delete).toHaveBeenCalled();
      expect(result.bookmarks).toEqual(expect.any(Array));
    });
  });
});

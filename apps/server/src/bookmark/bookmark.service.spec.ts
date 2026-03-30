import { Test, TestingModule } from '@nestjs/testing';
import { BookmarkService } from './bookmark.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma: any = {
  userBookmark: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
  },
  performanceArtist: {
    findMany: jest.fn(),
  },
  $transaction: jest.fn((fn: any) => fn(mockPrisma)),
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

  describe('findByPerformance', () => {
    it('should return bookmarks for artists in a performance', async () => {
      mockPrisma.performanceArtist.findMany.mockResolvedValue([
        { id: 'pa1' }, { id: 'pa2' },
      ]);
      mockPrisma.userBookmark.findMany.mockResolvedValue([
        { id: 'b1', userId: 'u1', performanceArtistId: 'pa1', checkedAt: new Date() },
      ]);

      const result = await service.findByPerformance('u1', 'p1');

      expect(mockPrisma.performanceArtist.findMany).toHaveBeenCalledWith({
        where: { performanceId: 'p1' },
        select: { id: true },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('toggle', () => {
    it('should create bookmark when not exists', async () => {
      mockPrisma.userBookmark.findUnique.mockResolvedValue(null);
      mockPrisma.userBookmark.create.mockResolvedValue({
        id: 'b1', userId: 'u1', performanceArtistId: 'pa1', checkedAt: new Date(),
      });

      const result = await service.toggle('u1', 'pa1', new Date().toISOString());
      expect(result.bookmarked).toBe(true);
    });

    it('should delete bookmark when exists', async () => {
      mockPrisma.userBookmark.findUnique.mockResolvedValue({
        id: 'b1', userId: 'u1', performanceArtistId: 'pa1', checkedAt: new Date(),
      });
      mockPrisma.userBookmark.delete.mockResolvedValue({});

      const result = await service.toggle('u1', 'pa1', new Date().toISOString());
      expect(result.bookmarked).toBe(false);
    });
  });

  describe('sync', () => {
    it('should upsert newer bookmarks, delete valid removals, return final state', async () => {
      mockPrisma.performanceArtist.findMany.mockResolvedValue([{ id: 'pa1' }, { id: 'pa2' }]);
      mockPrisma.userBookmark.findMany
        .mockResolvedValueOnce([
          { id: 'b1', userId: 'u1', performanceArtistId: 'pa1', checkedAt: new Date('2026-03-11T10:00:00Z') },
        ])
        .mockResolvedValueOnce([
          { id: 'b2', userId: 'u1', performanceArtistId: 'pa2', checkedAt: new Date('2026-03-11T11:00:00Z') },
        ]);
      mockPrisma.userBookmark.upsert.mockResolvedValue({});
      mockPrisma.userBookmark.delete.mockResolvedValue({});

      const result = await service.sync('u1', {
        performanceId: 'p1',
        bookmarks: [{ performanceArtistId: 'pa2', checkedAt: '2026-03-11T11:00:00Z' }],
        removals: [{ performanceArtistId: 'pa1', removedAt: '2026-03-11T12:00:00Z' }],
      });

      expect(mockPrisma.userBookmark.upsert).toHaveBeenCalled();
      expect(mockPrisma.userBookmark.delete).toHaveBeenCalled();
      expect(result.bookmarks).toEqual(expect.any(Array));
    });
  });
});

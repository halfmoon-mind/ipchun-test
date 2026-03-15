import { Test, TestingModule } from '@nestjs/testing';
import { ScheduleService } from './schedule.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  schedule: {
    findMany: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  scheduleLineup: {
    create: jest.fn(),
  },
  $transaction: jest.fn((fn) => fn(mockPrisma)),
};

describe('ScheduleService', () => {
  let service: ScheduleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduleService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ScheduleService>(ScheduleService);
    jest.clearAllMocks();
  });

  describe('findByArtist', () => {
    it('should return upcoming schedules sorted ascending when period is upcoming', async () => {
      mockPrisma.schedule.findMany.mockResolvedValue([]);

      await service.findByArtist('artist-1', { period: 'upcoming' });

      const call = mockPrisma.schedule.findMany.mock.calls[0][0];
      expect(call.where.lineups).toEqual({ some: { artistId: 'artist-1' } });
      expect(call.where.startDate.gte).toBeDefined();
      expect(call.orderBy[0].startDate).toBe('asc');
    });

    it('should return past schedules sorted descending with limit when period is past', async () => {
      mockPrisma.schedule.findMany.mockResolvedValue([]);

      await service.findByArtist('artist-1', { period: 'past', limit: 5 });

      const call = mockPrisma.schedule.findMany.mock.calls[0][0];
      expect(call.where.startDate.lt).toBeDefined();
      expect(call.orderBy[0].startDate).toBe('desc');
      expect(call.take).toBe(6); // limit + 1 for nextCursor detection
    });

    it('should handle cursor-based pagination using (startDate, id) composite cursor', async () => {
      const cursorSchedule = {
        startDate: new Date('2026-02-01T00:00:00Z'),
      };
      mockPrisma.schedule.findUniqueOrThrow.mockResolvedValue(cursorSchedule);
      mockPrisma.schedule.findMany.mockResolvedValue([]);

      await service.findByArtist('artist-1', { period: 'past', cursor: 'cursor-id', limit: 10 });

      const call = mockPrisma.schedule.findMany.mock.calls[0][0];
      expect(call.where.OR).toBeDefined();
      expect(call.where.OR).toHaveLength(2);
    });

    it('should return all schedules ascending when no period specified', async () => {
      mockPrisma.schedule.findMany.mockResolvedValue([]);

      await service.findByArtist('artist-1');

      const call = mockPrisma.schedule.findMany.mock.calls[0][0];
      expect(call.where.startDate).toBeUndefined();
      expect(call.orderBy.startDate).toBe('asc');
    });

    it('should detect nextCursor when more results exist', async () => {
      const schedules = Array.from({ length: 11 }, (_, i) => ({
        id: `s${i}`,
        startDate: new Date(`2026-01-${String(10 - i).padStart(2, '0')}T00:00:00Z`),
      }));
      mockPrisma.schedule.findMany.mockResolvedValue(schedules);

      const result = await service.findByArtist('artist-1', { period: 'past', limit: 10 });

      expect(result.data).toHaveLength(10);
      expect(result.nextCursor).toBe('s9');
    });
  });

  describe('findCalendar', () => {
    it('should query schedules within the given month range', async () => {
      mockPrisma.schedule.findMany.mockResolvedValue([]);

      const result = await service.findCalendar({ year: 2026, month: 3 });

      const call = mockPrisma.schedule.findMany.mock.calls[0][0];
      expect(call.where.OR).toHaveLength(3);
      // monthStart = 2026-03-01, monthEnd = 2026-04-01
      expect(call.where.OR[0].startDate.gte).toEqual(new Date('2026-03-01T00:00:00.000Z'));
      expect(call.where.OR[0].startDate.lt).toEqual(new Date('2026-04-01T00:00:00.000Z'));
      expect(result.year).toBe(2026);
      expect(result.month).toBe(3);
      expect(result.schedules).toEqual([]);
      expect(result.dates).toEqual({});
    });

    it('should filter by artistId when provided', async () => {
      mockPrisma.schedule.findMany.mockResolvedValue([]);

      await service.findCalendar({ year: 2026, month: 3, artistId: 'a1' });

      const call = mockPrisma.schedule.findMany.mock.calls[0][0];
      expect(call.where.lineups).toEqual({ some: { artistId: 'a1' } });
    });

    it('should build dates map from schedule data including multi-day events', async () => {
      mockPrisma.schedule.findMany.mockResolvedValue([
        {
          id: 's1',
          title: '페스티벌',
          type: 'FESTIVAL',
          startDate: new Date('2026-03-15T00:00:00Z'),
          endDate: new Date('2026-03-17T23:59:00Z'),
          lineups: [],
        },
        {
          id: 's2',
          title: '콘서트',
          type: 'CONCERT',
          startDate: new Date('2026-03-15T19:00:00Z'),
          endDate: null,
          lineups: [],
        },
      ]);

      const result = await service.findCalendar({ year: 2026, month: 3 });

      expect(result.dates['2026-03-15']).toContain('FESTIVAL');
      expect(result.dates['2026-03-15']).toContain('CONCERT');
      expect(result.dates['2026-03-16']).toContain('FESTIVAL');
      expect(result.dates['2026-03-17']).toContain('FESTIVAL');
    });
  });
});

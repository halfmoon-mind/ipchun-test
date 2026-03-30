import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceService } from './attendance.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma: any = {
  userAttendance: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  $transaction: jest.fn((fn: any) => fn(mockPrisma)),
};

describe('AttendanceService', () => {
  let service: AttendanceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
    jest.clearAllMocks();
  });

  describe('findByPerformance', () => {
    it('should return attendances for a user and performance', async () => {
      const mockAttendances = [
        { id: '1', userId: 'u1', performanceId: 'p1', date: new Date('2026-03-15'), checkedAt: new Date() },
      ];
      mockPrisma.userAttendance.findMany.mockResolvedValue(mockAttendances);

      const result = await service.findByPerformance('u1', 'p1');

      expect(mockPrisma.userAttendance.findMany).toHaveBeenCalledWith({
        where: { userId: 'u1', performanceId: 'p1' },
      });
      expect(result).toEqual(mockAttendances);
    });
  });

  describe('toggle', () => {
    it('should create attendance when not exists', async () => {
      mockPrisma.userAttendance.findUnique.mockResolvedValue(null);
      mockPrisma.userAttendance.create.mockResolvedValue({
        id: '1', userId: 'u1', performanceId: 'p1', date: new Date('2026-03-15'), checkedAt: new Date(),
      });

      const result = await service.toggle('u1', 'p1', '2026-03-15', new Date().toISOString());

      expect(result.attending).toBe(true);
    });

    it('should delete attendance when exists', async () => {
      mockPrisma.userAttendance.findUnique.mockResolvedValue({
        id: '1', userId: 'u1', performanceId: 'p1', date: new Date('2026-03-15'), checkedAt: new Date(),
      });
      mockPrisma.userAttendance.delete.mockResolvedValue({});

      const result = await service.toggle('u1', 'p1', '2026-03-15', new Date().toISOString());

      expect(result.attending).toBe(false);
    });
  });

  describe('sync', () => {
    it('should upsert newer attendances and delete older removals, then return final state', async () => {
      mockPrisma.userAttendance.findMany.mockResolvedValue([
        { id: '1', userId: 'u1', performanceId: 'p1', date: new Date('2026-03-15'), checkedAt: new Date('2026-03-11T10:00:00Z') },
      ]);
      mockPrisma.userAttendance.upsert.mockResolvedValue({});
      mockPrisma.userAttendance.delete.mockResolvedValue({});

      mockPrisma.userAttendance.findMany
        .mockResolvedValueOnce([
          { id: '1', userId: 'u1', performanceId: 'p1', date: new Date('2026-03-15'), checkedAt: new Date('2026-03-11T10:00:00Z') },
        ])
        .mockResolvedValueOnce([
          { id: '2', userId: 'u1', performanceId: 'p1', date: new Date('2026-03-17'), checkedAt: new Date('2026-03-11T11:00:00Z') },
        ]);

      const result = await service.sync('u1', {
        performanceId: 'p1',
        attendances: [{ date: '2026-03-17', checkedAt: '2026-03-11T11:00:00Z' }],
        removals: [{ date: '2026-03-15', removedAt: '2026-03-11T12:00:00Z' }],
      });

      expect(mockPrisma.userAttendance.upsert).toHaveBeenCalled();
      expect(mockPrisma.userAttendance.delete).toHaveBeenCalled();
      expect(result.attendances).toEqual(expect.any(Array));
    });
  });
});

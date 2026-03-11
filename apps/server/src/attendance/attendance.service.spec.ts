import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceService } from './attendance.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  userScheduleAttendance: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  $transaction: jest.fn((fn) => fn(mockPrisma)),
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

  describe('findBySchedule', () => {
    it('should return attendances for a user and schedule', async () => {
      const mockAttendances = [
        { id: '1', userId: 'u1', scheduleId: 's1', date: new Date('2026-03-15'), checkedAt: new Date() },
      ];
      mockPrisma.userScheduleAttendance.findMany.mockResolvedValue(mockAttendances);

      const result = await service.findBySchedule('u1', 's1');

      expect(mockPrisma.userScheduleAttendance.findMany).toHaveBeenCalledWith({
        where: { userId: 'u1', scheduleId: 's1' },
      });
      expect(result).toEqual(mockAttendances);
    });
  });

  describe('toggle', () => {
    it('should create attendance when not exists', async () => {
      mockPrisma.userScheduleAttendance.findUnique.mockResolvedValue(null);
      mockPrisma.userScheduleAttendance.create.mockResolvedValue({
        id: '1', userId: 'u1', scheduleId: 's1', date: new Date('2026-03-15'), checkedAt: new Date(),
      });

      const result = await service.toggle('u1', 's1', '2026-03-15', new Date().toISOString());

      expect(result.attending).toBe(true);
    });

    it('should delete attendance when exists', async () => {
      mockPrisma.userScheduleAttendance.findUnique.mockResolvedValue({
        id: '1', userId: 'u1', scheduleId: 's1', date: new Date('2026-03-15'), checkedAt: new Date(),
      });
      mockPrisma.userScheduleAttendance.delete.mockResolvedValue({});

      const result = await service.toggle('u1', 's1', '2026-03-15', new Date().toISOString());

      expect(result.attending).toBe(false);
    });
  });

  describe('sync', () => {
    it('should upsert newer bookmarks and delete older removals, then return final state', async () => {
      mockPrisma.userScheduleAttendance.findMany.mockResolvedValue([
        { id: '1', userId: 'u1', scheduleId: 's1', date: new Date('2026-03-15'), checkedAt: new Date('2026-03-11T10:00:00Z') },
      ]);
      mockPrisma.userScheduleAttendance.upsert.mockResolvedValue({});
      mockPrisma.userScheduleAttendance.delete.mockResolvedValue({});

      mockPrisma.userScheduleAttendance.findMany
        .mockResolvedValueOnce([
          { id: '1', userId: 'u1', scheduleId: 's1', date: new Date('2026-03-15'), checkedAt: new Date('2026-03-11T10:00:00Z') },
        ])
        .mockResolvedValueOnce([
          { id: '2', userId: 'u1', scheduleId: 's1', date: new Date('2026-03-17'), checkedAt: new Date('2026-03-11T11:00:00Z') },
        ]);

      const result = await service.sync('u1', {
        scheduleId: 's1',
        attendances: [{ date: '2026-03-17', checkedAt: '2026-03-11T11:00:00Z' }],
        removals: [{ date: '2026-03-15', removedAt: '2026-03-11T12:00:00Z' }],
      });

      expect(mockPrisma.userScheduleAttendance.upsert).toHaveBeenCalled();
      expect(mockPrisma.userScheduleAttendance.delete).toHaveBeenCalled();
      expect(result.attendances).toEqual(expect.any(Array));
    });
  });
});

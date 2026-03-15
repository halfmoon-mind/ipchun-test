import { Test, TestingModule } from '@nestjs/testing';
import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';

const mockService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findByArtist: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  findCalendar: jest.fn(),
};

describe('ScheduleController', () => {
  let controller: ScheduleController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScheduleController],
      providers: [{ provide: ScheduleService, useValue: mockService }],
    }).compile();

    controller = module.get<ScheduleController>(ScheduleController);
    jest.clearAllMocks();
  });

  describe('GET /schedules', () => {
    it('should call findByArtist with options when artistId and period provided', async () => {
      mockService.findByArtist.mockResolvedValue({ data: [], nextCursor: null });

      const query = { artistId: 'a1', period: 'upcoming' as const };
      const result = await controller.findAll(query);

      expect(mockService.findByArtist).toHaveBeenCalledWith('a1', {
        period: 'upcoming',
        cursor: undefined,
        limit: undefined,
      });
      expect(result).toEqual({ data: [], nextCursor: null });
    });

    it('should call findAll when no artistId provided', async () => {
      mockService.findAll.mockResolvedValue([]);

      const result = await controller.findAll({});

      expect(mockService.findAll).toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should pass cursor and limit for past pagination', async () => {
      mockService.findByArtist.mockResolvedValue({ data: [], nextCursor: null });

      await controller.findAll({
        artistId: 'a1',
        period: 'past' as const,
        cursor: 'c1',
        limit: 5,
      });

      expect(mockService.findByArtist).toHaveBeenCalledWith('a1', {
        period: 'past',
        cursor: 'c1',
        limit: 5,
      });
    });
  });

  describe('GET /schedules/calendar', () => {
    it('should call findCalendar with year, month', async () => {
      const mockResult = { year: 2026, month: 3, schedules: [], dates: {} };
      mockService.findCalendar.mockResolvedValue(mockResult);

      const result = await controller.getCalendar({ year: 2026, month: 3 });

      expect(mockService.findCalendar).toHaveBeenCalledWith({ year: 2026, month: 3, artistId: undefined });
      expect(result).toEqual(mockResult);
    });

    it('should pass artistId when provided', async () => {
      const mockResult = { year: 2026, month: 3, schedules: [], dates: {} };
      mockService.findCalendar.mockResolvedValue(mockResult);

      await controller.getCalendar({ year: 2026, month: 3, artistId: 'a1' });

      expect(mockService.findCalendar).toHaveBeenCalledWith({ year: 2026, month: 3, artistId: 'a1' });
    });
  });
});

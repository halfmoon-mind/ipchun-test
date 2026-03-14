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

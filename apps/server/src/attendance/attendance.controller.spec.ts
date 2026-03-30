import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';

const mockService = {
  findByPerformance: jest.fn(),
  toggle: jest.fn(),
  sync: jest.fn(),
};

describe('AttendanceController', () => {
  let controller: AttendanceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AttendanceController],
      providers: [{ provide: AttendanceService, useValue: mockService }],
    }).compile();

    controller = module.get<AttendanceController>(AttendanceController);
    jest.clearAllMocks();
  });

  it('GET /attendances should call findByPerformance', async () => {
    mockService.findByPerformance.mockResolvedValue([]);
    const headers = { 'x-user-id': 'u1' };
    const result = await controller.findAll(headers, 'p1');
    expect(mockService.findByPerformance).toHaveBeenCalledWith('u1', 'p1');
    expect(result).toEqual({ attendances: [] });
  });

  it('PUT /attendances/sync should call sync', async () => {
    mockService.sync.mockResolvedValue({ attendances: [] });
    const headers = { 'x-user-id': 'u1' };
    const dto = { performanceId: 'p1', attendances: [], removals: [] };
    const result = await controller.sync(headers, dto);
    expect(mockService.sync).toHaveBeenCalledWith('u1', dto);
  });

  it('PUT /attendances/:performanceId/:date should call toggle', async () => {
    mockService.toggle.mockResolvedValue({ attending: true });
    const headers = { 'x-user-id': 'u1' };
    const result = await controller.toggle(headers, 'p1', '2026-03-15', { checkedAt: '2026-03-11T10:00:00Z' });
    expect(mockService.toggle).toHaveBeenCalledWith('u1', 'p1', '2026-03-15', '2026-03-11T10:00:00Z');
  });
});

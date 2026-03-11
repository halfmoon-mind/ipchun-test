import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';

const mockService = {
  findBySchedule: jest.fn(),
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

  it('GET /attendances should call findBySchedule', async () => {
    mockService.findBySchedule.mockResolvedValue([]);
    const headers = { 'x-user-id': 'u1' };
    const result = await controller.findAll(headers, 's1');
    expect(mockService.findBySchedule).toHaveBeenCalledWith('u1', 's1');
    expect(result).toEqual({ attendances: [] });
  });

  it('PUT /attendances/sync should call sync', async () => {
    mockService.sync.mockResolvedValue({ attendances: [] });
    const headers = { 'x-user-id': 'u1' };
    const dto = { scheduleId: 's1', attendances: [], removals: [] };
    const result = await controller.sync(headers, dto);
    expect(mockService.sync).toHaveBeenCalledWith('u1', dto);
  });

  it('PUT /attendances/:scheduleId/:date should call toggle', async () => {
    mockService.toggle.mockResolvedValue({ attending: true });
    const headers = { 'x-user-id': 'u1' };
    const result = await controller.toggle(headers, 's1', '2026-03-15', { checkedAt: '2026-03-11T10:00:00Z' });
    expect(mockService.toggle).toHaveBeenCalledWith('u1', 's1', '2026-03-15', '2026-03-11T10:00:00Z');
  });
});

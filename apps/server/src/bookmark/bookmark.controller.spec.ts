import { Test, TestingModule } from '@nestjs/testing';
import { BookmarkController } from './bookmark.controller';
import { BookmarkService } from './bookmark.service';

const mockService = {
  findByPerformance: jest.fn(),
  toggle: jest.fn(),
  sync: jest.fn(),
};

describe('BookmarkController', () => {
  let controller: BookmarkController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookmarkController],
      providers: [{ provide: BookmarkService, useValue: mockService }],
    }).compile();

    controller = module.get<BookmarkController>(BookmarkController);
    jest.clearAllMocks();
  });

  it('GET /bookmarks should call findByPerformance', async () => {
    mockService.findByPerformance.mockResolvedValue([]);
    const headers = { 'x-user-id': 'u1' };
    const result = await controller.findAll(headers, 'p1');
    expect(mockService.findByPerformance).toHaveBeenCalledWith('u1', 'p1');
    expect(result).toEqual({ bookmarks: [] });
  });

  it('PUT /bookmarks/sync should call sync', async () => {
    mockService.sync.mockResolvedValue({ bookmarks: [] });
    const headers = { 'x-user-id': 'u1' };
    const dto = { performanceId: 'p1', bookmarks: [], removals: [] };
    const result = await controller.sync(headers, dto);
    expect(mockService.sync).toHaveBeenCalledWith('u1', dto);
  });

  it('PUT /bookmarks/:performanceArtistId should call toggle', async () => {
    mockService.toggle.mockResolvedValue({ bookmarked: true });
    const headers = { 'x-user-id': 'u1' };
    const result = await controller.toggle(headers, 'pa1', { checkedAt: '2026-03-11T10:00:00Z' });
    expect(mockService.toggle).toHaveBeenCalledWith('u1', 'pa1', '2026-03-11T10:00:00Z');
  });
});

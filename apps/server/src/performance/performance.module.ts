import { Module } from '@nestjs/common';
import { PerformanceController } from './performance.controller';
import { PerformanceService } from './performance.service';
import { BatchScanService } from './batch-scan.service';

@Module({
  controllers: [PerformanceController],
  providers: [PerformanceService, BatchScanService],
  exports: [PerformanceService, BatchScanService],
})
export class PerformanceModule {}

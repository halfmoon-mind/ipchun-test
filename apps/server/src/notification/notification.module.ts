import { Module } from '@nestjs/common';
import { OneSignalService } from './onesignal.service';
import { NotificationService } from './notification.service';
import { NotificationScheduler } from './notification.scheduler';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [OneSignalService, NotificationService, NotificationScheduler],
  exports: [NotificationService],
})
export class NotificationModule {}

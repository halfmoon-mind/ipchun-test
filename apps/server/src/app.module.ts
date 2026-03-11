import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ArtistModule } from './artist/artist.module';
import { ScheduleModule } from './schedule/schedule.module';
import { AttendanceModule } from './attendance/attendance.module';
import { BookmarkModule } from './bookmark/bookmark.module';

@Module({
  imports: [PrismaModule, ArtistModule, ScheduleModule, AttendanceModule, BookmarkModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

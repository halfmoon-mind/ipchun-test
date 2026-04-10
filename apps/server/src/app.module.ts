import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ArtistModule } from './artist/artist.module';
import { AttendanceModule } from './attendance/attendance.module';
import { BookmarkModule } from './bookmark/bookmark.module';
import { PerformanceModule } from './performance/performance.module';
import { SpotifyModule } from './spotify/spotify.module';
import { UserModule } from './user/user.module';
import { NotificationModule } from './notification/notification.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    SpotifyModule,
    UserModule,
    ArtistModule,
    AttendanceModule,
    BookmarkModule,
    PerformanceModule,
    NotificationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

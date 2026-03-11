import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ArtistModule } from './artist/artist.module';
import { ScheduleModule } from './schedule/schedule.module';

@Module({
  imports: [PrismaModule, ArtistModule, ScheduleModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

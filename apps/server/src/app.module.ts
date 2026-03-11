import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ArtistModule } from './artist/artist.module';

@Module({
  imports: [PrismaModule, ArtistModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

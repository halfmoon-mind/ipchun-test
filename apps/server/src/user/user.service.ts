import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SignInDto } from './dto/sign-in.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async signIn(dto: SignInDto) {
    const existingAccount = await this.prisma.account.findUnique({
      where: { provider_providerAccountId: { provider: dto.provider, providerAccountId: dto.providerAccountId } },
      include: { user: true },
    });

    if (existingAccount) {
      return { user: existingAccount.user, isNew: false };
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (existingUser) {
      await this.prisma.account.create({
        data: { userId: existingUser.id, provider: dto.provider, providerAccountId: dto.providerAccountId },
      });
      return { user: existingUser, isNew: false };
    }

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        nickname: dto.nickname ?? null,
        imageUrl: dto.imageUrl ?? null,
        accounts: {
          create: { provider: dto.provider, providerAccountId: dto.providerAccountId },
        },
      },
    });

    return { user, isNew: true };
  }

  async findByExternalId(externalId: string) {
    const user = await this.prisma.user.findUnique({ where: { externalId } });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다');
    return user;
  }

  async update(externalId: string, dto: UpdateUserDto) {
    const user = await this.findByExternalId(externalId);
    return this.prisma.user.update({
      where: { id: user.id },
      data: { nickname: dto.nickname, imageUrl: dto.imageUrl },
    });
  }

  async registerDeviceToken(externalId: string, playerId: string) {
    const user = await this.findByExternalId(externalId);
    return this.prisma.user.update({
      where: { id: user.id },
      data: { oneSignalPlayerId: playerId },
    });
  }

  async followArtist(externalId: string, artistId: string) {
    const user = await this.findByExternalId(externalId);
    const artist = await this.prisma.artist.findUnique({ where: { id: artistId } });
    if (!artist) throw new NotFoundException('아티스트를 찾을 수 없습니다');
    try {
      return await this.prisma.userFollowArtist.create({
        data: { userId: user.id, artistId },
        include: { artist: { select: { id: true, name: true, imageUrl: true } } },
      });
    } catch {
      throw new ConflictException('이미 팔로우한 아티스트입니다');
    }
  }

  async unfollowArtist(externalId: string, artistId: string) {
    const user = await this.findByExternalId(externalId);
    const follow = await this.prisma.userFollowArtist.findUnique({
      where: { userId_artistId: { userId: user.id, artistId } },
    });
    if (!follow) throw new NotFoundException('팔로우하지 않은 아티스트입니다');
    await this.prisma.userFollowArtist.delete({
      where: { userId_artistId: { userId: user.id, artistId } },
    });
  }

  async getFollowedArtists(externalId: string) {
    const user = await this.findByExternalId(externalId);
    const follows = await this.prisma.userFollowArtist.findMany({
      where: { userId: user.id },
      include: { artist: { select: { id: true, name: true, imageUrl: true, spotifyUrl: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return follows.map((f) => f.artist);
  }
}

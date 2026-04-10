import { Injectable, NotFoundException } from '@nestjs/common';
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
}

import { Controller, Get, Post, Patch, Body, Headers, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { UserService } from './user.service';
import { SignInDto } from './dto/sign-in.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  private getExternalId(headers: Record<string, string>): string {
    const externalId = headers['x-user-id'];
    if (!externalId) throw new BadRequestException('x-user-id header is required');
    return externalId;
  }

  @Post('sign-in')
  @ApiOperation({ summary: '소셜 로그인 (Apple / Google) — 없으면 가입, 있으면 로그인' })
  async signIn(@Body() dto: SignInDto) {
    const { user, isNew } = await this.userService.signIn(dto);
    return {
      userId: user.externalId,
      email: user.email,
      nickname: user.nickname,
      imageUrl: user.imageUrl,
      isNew,
    };
  }

  @Get('me')
  @ApiHeader({ name: 'x-user-id', required: true, description: '사용자 externalId' })
  @ApiOperation({ summary: '내 프로필 조회' })
  async getMe(@Headers() headers: Record<string, string>) {
    const externalId = this.getExternalId(headers);
    const user = await this.userService.findByExternalId(externalId);
    return {
      userId: user.externalId,
      email: user.email,
      nickname: user.nickname,
      imageUrl: user.imageUrl,
      createdAt: user.createdAt,
    };
  }

  @Patch('me')
  @ApiHeader({ name: 'x-user-id', required: true, description: '사용자 externalId' })
  @ApiOperation({ summary: '내 프로필 수정 (nickname, imageUrl)' })
  async updateMe(
    @Headers() headers: Record<string, string>,
    @Body() dto: UpdateUserDto,
  ) {
    const externalId = this.getExternalId(headers);
    const user = await this.userService.update(externalId, dto);
    return {
      userId: user.externalId,
      email: user.email,
      nickname: user.nickname,
      imageUrl: user.imageUrl,
    };
  }
}

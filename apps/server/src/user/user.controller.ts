import { Controller, Get, Post, Patch, Delete, Body, Headers, Param, BadRequestException, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { UserService } from './user.service';
import { SignInDto } from './dto/sign-in.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RegisterDeviceTokenDto } from './dto/register-device-token.dto';

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

  @Patch('me/device-token')
  @ApiHeader({ name: 'x-user-id', required: true, description: '사용자 externalId' })
  @ApiOperation({ summary: 'OneSignal 디바이스 토큰 등록/갱신' })
  async registerDeviceToken(
    @Headers() headers: Record<string, string>,
    @Body() dto: RegisterDeviceTokenDto,
  ) {
    const externalId = this.getExternalId(headers);
    await this.userService.registerDeviceToken(externalId, dto.playerId);
    return { ok: true };
  }

  @Post('me/follows/:artistId')
  @ApiHeader({ name: 'x-user-id', required: true, description: '사용자 externalId' })
  @ApiOperation({ summary: '아티스트 팔로우' })
  async followArtist(
    @Headers() headers: Record<string, string>,
    @Param('artistId') artistId: string,
  ) {
    const externalId = this.getExternalId(headers);
    return this.userService.followArtist(externalId, artistId);
  }

  @Delete('me/follows/:artistId')
  @HttpCode(204)
  @ApiHeader({ name: 'x-user-id', required: true, description: '사용자 externalId' })
  @ApiOperation({ summary: '아티스트 언팔로우' })
  async unfollowArtist(
    @Headers() headers: Record<string, string>,
    @Param('artistId') artistId: string,
  ) {
    const externalId = this.getExternalId(headers);
    await this.userService.unfollowArtist(externalId, artistId);
  }

  @Get('me/follows')
  @ApiHeader({ name: 'x-user-id', required: true, description: '사용자 externalId' })
  @ApiOperation({ summary: '팔로우한 아티스트 목록' })
  async getFollowedArtists(@Headers() headers: Record<string, string>) {
    const externalId = this.getExternalId(headers);
    return this.userService.getFollowedArtists(externalId);
  }
}

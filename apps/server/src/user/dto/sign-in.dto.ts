import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AuthProvider {
  APPLE = 'APPLE',
  GOOGLE = 'GOOGLE',
}

export class SignInDto {
  @ApiProperty({ enum: AuthProvider, description: 'OAuth 제공자' })
  @IsEnum(AuthProvider)
  provider!: AuthProvider;

  @ApiProperty({ description: 'OAuth 제공자의 사용자 고유 ID' })
  @IsString()
  providerAccountId!: string;

  @ApiProperty({ description: '이메일 주소' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ description: '닉네임' })
  @IsOptional()
  @IsString()
  nickname?: string;

  @ApiPropertyOptional({ description: '프로필 이미지 URL' })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}

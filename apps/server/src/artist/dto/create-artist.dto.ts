import { IsString, IsOptional, IsObject, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateArtistDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'string' },
    example: { instagram: 'https://instagram.com/artist', youtube: 'https://youtube.com/@artist' },
  })
  @IsObject()
  @IsOptional()
  socialLinks?: Record<string, string>;

  @IsString()
  @IsOptional()
  spotifyId?: string;

  @IsString()
  @IsOptional()
  spotifyUrl?: string;
}

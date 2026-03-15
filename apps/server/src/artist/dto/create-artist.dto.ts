import { IsString, IsOptional, IsObject, IsNotEmpty } from 'class-validator';

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

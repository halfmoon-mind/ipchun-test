import { IsBoolean, IsOptional, IsString, IsUrl } from 'class-validator';

export class FetchUrlDto {
  @IsString()
  @IsUrl()
  url!: string;

  @IsOptional()
  @IsBoolean()
  skipDuplicateCheck?: boolean;
}

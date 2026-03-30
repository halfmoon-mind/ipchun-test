import { IsString, IsUrl } from 'class-validator';

export class FetchUrlDto {
  @IsString()
  @IsUrl()
  url!: string;
}

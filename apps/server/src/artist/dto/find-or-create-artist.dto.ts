import { IsString, IsNotEmpty } from 'class-validator';

export class FindOrCreateArtistDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}

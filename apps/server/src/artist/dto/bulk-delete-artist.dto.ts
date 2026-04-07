import { IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkDeleteArtistDto {
  @ApiProperty({ description: '삭제할 아티스트 ID 목록', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  ids!: string[];
}

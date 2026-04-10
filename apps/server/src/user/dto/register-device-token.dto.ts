import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class RegisterDeviceTokenDto {
  @ApiProperty({ description: 'OneSignal Player ID (subscription ID)' })
  @IsString()
  @IsNotEmpty()
  playerId!: string;
}

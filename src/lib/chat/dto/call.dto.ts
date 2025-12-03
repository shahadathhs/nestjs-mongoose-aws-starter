import { CallType } from '@/lib/database/enums';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class InitiateCallDto {
  @ApiProperty({ description: 'ID of the conversation to initiate call in' })
  @IsString()
  @IsNotEmpty()
  conversationId: string;

  @ApiProperty({ enum: CallType, description: 'Type of call (AUDIO or VIDEO)' })
  @IsEnum(CallType)
  type: CallType;
}

export class CallActionDto {
  @ApiProperty({ description: 'ID of the call' })
  @IsString()
  @IsNotEmpty()
  callId: string;
}

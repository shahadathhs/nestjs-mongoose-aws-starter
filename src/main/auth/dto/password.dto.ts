import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ChangePasswordDto {
  @ApiPropertyOptional({
    description: 'Current password. Optional for Google Sign-In',
    example: 'strongPassword123',
  })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiProperty({ example: 'NewstrongPassword123' })
  @IsString()
  newPassword: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example' })
  @IsString()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: '1234' })
  @IsString()
  otp: string;

  @ApiProperty({ example: 'user@example' })
  @IsString()
  email: string;

  @ApiProperty({ example: 'newStrongPassword123' })
  @IsString()
  newPassword: string;
}

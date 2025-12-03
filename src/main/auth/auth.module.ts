import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthGetProfileService } from './services/auth-get-profile.service';
import { AuthLoginService } from './services/auth-login.service';
import { AuthLogoutService } from './services/auth-logout.service';
import { AuthOtpService } from './services/auth-otp.service';
import { AuthPasswordService } from './services/auth-password.service';
import { AuthRegisterService } from './services/auth-register.service';
import { AuthUpdateProfileService } from './services/auth-update-profile.service';

@Module({
  imports: [],
  controllers: [AuthController],
  providers: [
    AuthRegisterService,
    AuthLoginService,
    AuthLogoutService,
    AuthOtpService,
    AuthPasswordService,
    AuthGetProfileService,
    AuthUpdateProfileService,
  ],
})
export class AuthModule {}

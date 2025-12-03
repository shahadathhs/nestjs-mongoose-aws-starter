import { successResponse, TResponse } from '@/common/utils/response.util';
import { AppError } from '@/core/error/handle-error.app';
import { HandleError } from '@/core/error/handle-error.decorator';
import { OtpType } from '@/lib/database/enums';
import { User, UserDocument } from '@/lib/database/schemas/user.schema';
import { AuthMailService } from '@/lib/mail/services/auth-mail.service';
import { AuthUtilsService } from '@/lib/utils/services/auth-utils.service';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LoginDto } from '../dto/login.dto';

@Injectable()
export class AuthLoginService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly authMailService: AuthMailService,
    private readonly utils: AuthUtilsService,
  ) {}

  @HandleError('Login failed', 'User')
  async login(dto: LoginDto): Promise<TResponse<any>> {
    const { email, password } = dto;

    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    const isPasswordCorrect = await this.utils.compare(password, user.password);
    if (!isPasswordCorrect) {
      throw new AppError(400, 'Invalid password');
    }

    // 1. Email verification
    if (!user.isVerified) {
      const otp = await this.utils.generateOTPAndSave(user._id, OtpType.VERIFICATION);

      await this.authMailService.sendVerificationCodeEmail(
        user.email,
        otp.toString(),
      );

      return successResponse(
        { email: user.email },
        'Your email is not verified. A new OTP has been sent to your email.',
      );
    }

    // 2. Regular login
    const updatedUser = await this.userModel.findOneAndUpdate(
      { email },
      {
        lastLoginAt: new Date(),
        lastActiveAt: new Date(),
      },
      { new: true },
    );

    if (!updatedUser) {
      throw new AppError(404, 'User not found');
    }

    // 3. Generate token
    const token = await this.utils.generateTokenPairAndSave({
      email,
      role: updatedUser.role,
      sub: updatedUser._id,
    });

    return successResponse(
      {
        user: await this.utils.sanitizeUser(updatedUser),
        token,
      },
      'Logged in successfully',
    );
  }
}

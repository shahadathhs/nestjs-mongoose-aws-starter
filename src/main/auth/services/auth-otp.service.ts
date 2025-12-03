import { UserResponseDto } from '@/common/dto/user-response.dto';
import { successResponse, TResponse } from '@/common/utils/response.util';
import { AppError } from '@/core/error/handle-error.app';
import { HandleError } from '@/core/error/handle-error.decorator';
import { OtpType } from '@/lib/database/enums';
import { UserOtp, UserOtpDocument } from '@/lib/database/schemas/user-otp.schema';
import { User, UserDocument } from '@/lib/database/schemas/user.schema';
import { AuthMailService } from '@/lib/mail/services/auth-mail.service';
import { AuthUtilsService } from '@/lib/utils/services/auth-utils.service';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ResendOtpDto, VerifyOTPDto } from '../dto/otp.dto';

@Injectable()
export class AuthOtpService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(UserOtp.name) private readonly userOtpModel: Model<UserOtpDocument>,
    private readonly utils: AuthUtilsService,
    private readonly authMailService: AuthMailService,
  ) {}

  @HandleError('Failed to resend OTP')
  async resendOtp({ email, type }: ResendOtpDto): Promise<TResponse<any>> {
    // 1. Find user
    const user = await this.userModel.findOne({ email });
    if (!user) throw new AppError(404, 'User not found');

    if (user.isVerified && type === OtpType.VERIFICATION) {
      throw new AppError(400, 'User is already verified');
    }

    // 2. Delete existing unexpired OTPs of this type
    await this.userOtpModel.deleteMany({
      userId: user._id,
      type,
      expiresAt: { $gt: new Date() },
    });

    // 3. Generate new OTP and hash
    const otp = await this.utils.generateOTPAndSave(user._id, type as OtpType);

    // 4. Send email
    try {
      if (type === OtpType.VERIFICATION) {
        await this.authMailService.sendVerificationCodeEmail(
          email,
          otp.toString(),
          {
            subject: 'Your OTP Code',
            message: `Here is your OTP code. It will expire in 5 minutes.`,
          },
        );
      }

      if (type === OtpType.RESET) {
        await this.authMailService.sendResetPasswordCodeEmail(
          email,
          otp.toString(),
          {
            subject: 'Your OTP Code',
            message: `Here is your OTP code. It will expire in 5 minutes.`,
          },
        );
      }
    } catch (err) {
      console.error(err);
      // Clean up in case email fails
      await this.userOtpModel.deleteMany({
        userId: user._id,
        type,
      });
      throw new AppError(
        500,
        'Failed to send OTP email. Please try again later.',
      );
    }

    return successResponse(null, `${type} OTP sent successfully`);
  }

  @HandleError('OTP verification failed', 'User')
  async verifyOTP(
    dto: VerifyOTPDto,
    type: OtpType = OtpType.VERIFICATION,
  ): Promise<TResponse<any>> {
    const { email, otp } = dto;

    // 1. Find user
    const user = await this.userModel.findOne({ email });
    if (!user) throw new AppError(404, 'User not found');

    // 2. Find latest OTP for user and type
    const userOtp = await this.userOtpModel.findOne({
      userId: user._id,
      type,
    }).sort({ createdAt: -1 });

    if (!userOtp)
      throw new AppError(400, 'OTP is not set. Please request a new one.');

    if (userOtp.expiresAt < new Date()) {
      // Expired -> delete
      await this.userOtpModel.deleteOne({ _id: userOtp._id });
      throw new AppError(400, 'OTP has expired. Please request a new one.');
    }

    const isCorrectOtp = await this.utils.compare(otp, userOtp.code);
    if (!isCorrectOtp) throw new AppError(400, 'Invalid OTP');

    // 3. OTP verified -> delete OTP
    await this.userOtpModel.deleteMany({
      userId: user._id,
      type,
    });

    // 4. Mark user verified if verification OTP
    const updateData: Partial<User> = {
      lastLoginAt: new Date(),
      lastActiveAt: new Date(),
    };
    if (type === OtpType.VERIFICATION) {
      updateData.isVerified = true;
    }

    const updatedUser = await this.userModel.findByIdAndUpdate(
      user._id,
      updateData,
      { new: true },
    ).populate('profilePictureId');

    if (!updatedUser) throw new AppError(404, 'User not found');

    // 5. Generate token
    const token = await this.utils.generateTokenPairAndSave({
      sub: updatedUser._id,
      email: updatedUser.email,
      role: updatedUser.role,
    });

    return successResponse(
      {
        user: await this.utils.sanitizeUser<UserResponseDto>(updatedUser),
        token,
      },
      'OTP verified successfully',
    );
  }
}

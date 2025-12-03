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
import { RegisterDto } from '../dto/register.dto';

@Injectable()
export class AuthRegisterService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly authMailService: AuthMailService,
    private readonly utils: AuthUtilsService,
  ) {}

  @HandleError('Registration failed', 'User')
  async register(dto: RegisterDto): Promise<TResponse<any>> {
    const { email, password, name } = dto;

    // Check if user email already exists
    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new AppError(400, 'User already exists with this email');
    }

    // Create new user
    const newUser = await this.userModel.create({
      email,
      name,
      password: await this.utils.hash(password),
    });

    // Generate OTP and save
    const otp = await this.utils.generateOTPAndSave(newUser._id, OtpType.VERIFICATION);

    // Send verification email
    await this.authMailService.sendVerificationCodeEmail(
      email,
      otp.toString(),
      {
        subject: 'Verify your email',
        message:
          'Welcome to our platform! Your account has been successfully created.',
      },
    );

    // Return sanitized response
    return successResponse(
      {
        email: newUser.email,
      },
      `Registration successful. A verification email has been sent to ${newUser.email}.`,
    );
  }
}

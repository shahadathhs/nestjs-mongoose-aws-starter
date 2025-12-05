import { successResponse, TResponse } from '@/common/utils/response.util';
import { AppError } from '@/core/error/handle-error.app';
import { HandleError } from '@/core/error/handle-error.decorator';
import { User } from '@/lib/database/schemas/user.schema';
import { AuthUtilsService } from '@/lib/utils/services/auth-utils.service';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class AuthGetProfileService {
  constructor(
    @InjectModel(User.name) protected readonly userModel: Model<User>,
    private readonly authUtils: AuthUtilsService,
  ) {}

  @HandleError("Can't get user profile")
  async getProfile(userId: string) {
    const user = await this.findUserBy('_id', userId);
    return user;
  }

  private async findUserBy(
    key: '_id' | 'email',
    value: string,
  ): Promise<TResponse<any>> {
    const user = await this.userModel.findOne({ [key]: value });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    const sanitizedUser = await this.authUtils.sanitizeUser(user);

    return successResponse(sanitizedUser, 'User data fetched successfully');
  }
}

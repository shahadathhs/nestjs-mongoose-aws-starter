import { successResponse } from '@/common/utils/response.util';
import { AppError } from '@/core/error/handle-error.app';
import { HandleError } from '@/core/error/handle-error.decorator';
import { FileInstance } from '@/lib/database/schemas/file-instance.schema';
import { User, UserDocument } from '@/lib/database/schemas/user.schema';
import { S3Service } from '@/lib/file/services/s3.service';
import { AuthUtilsService } from '@/lib/utils/services/auth-utils.service';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UpdateProfileDto } from '../dto/update-profile.dto';

@Injectable()
export class AuthUpdateProfileService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly authUtils: AuthUtilsService,
    private readonly s3: S3Service,
  ) {}

  @HandleError('Failed to update profile', 'User')
  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
    file?: Express.Multer.File,
  ) {
    const user = await this.userModel.findById({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // * if image is provided, upload to S3 and update user
    let fileInstance: FileInstance | undefined;
    if (file) {
      const uploadFile = await this.s3.uploadFile(file);

      if (uploadFile) {
        fileInstance = uploadFile;
      }
    }

    const updatedUser = await this.userModel.updateOne(
      { id: userId },
      {
        name: dto.name?.trim() ? dto.name.trim() : user.name,
        ...(fileInstance && {
          profilePicture: {
            connect: fileInstance,
          },
        }),
      },
    );

    return successResponse(
      await this.authUtils.sanitizeUser(updatedUser),
      'Profile updated successfully',
    );
  }
}

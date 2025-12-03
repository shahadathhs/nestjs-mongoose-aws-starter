import { successResponse, TResponse } from '@/common/utils/response.util';
import { AppError } from '@/core/error/handle-error.app';
import { HandleError } from '@/core/error/handle-error.decorator';
import { TokenPair } from '@/core/jwt/jwt.interface';
import { User, UserDocument } from '@/lib/database/schemas/user.schema';
import { AuthUtilsService } from '@/lib/utils/services/auth-utils.service';
import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LogoutDto, RefreshTokenDto } from '../dto/logout.dto';

@Injectable()
export class AuthLogoutService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly utils: AuthUtilsService,
  ) {}

  @HandleError('Logout user failed', 'User')
  async logout(userId: string, dto: LogoutDto): Promise<TResponse<any>> {
    // Ensure refresh token exists and belongs to the user
    const tokenRecord = await this.utils.findRefreshToken(dto.refreshToken);

    if (!tokenRecord || tokenRecord.userId !== userId) {
      throw new AppError(HttpStatus.UNAUTHORIZED, 'Invalid refresh token');
    }

    // Delete the provided refresh token (logout)
    await this.utils.revokeAllRefreshTokensForUser(userId);

    return successResponse(null, 'Logout successful');
  }

  @HandleError('Refresh token failed')
  async refresh(dto: RefreshTokenDto): Promise<TResponse<TokenPair>> {
    const tokenRecord = await this.utils.findRefreshToken(dto.refreshToken);

    if (!tokenRecord) {
      throw new AppError(
        HttpStatus.UNAUTHORIZED,
        'Invalid or expired refresh token',
      );
    }

    // Check expiration
    if (tokenRecord.expiresAt < new Date()) {
      await this.utils.revokeRefreshToken(dto.refreshToken);
      throw new AppError(HttpStatus.UNAUTHORIZED, 'Refresh token expired');
    }

    // Get user info
    const user = await this.userModel.findById(tokenRecord.userId);

    if (!user) {
      await this.utils.revokeRefreshToken(dto.refreshToken);
      throw new AppError(HttpStatus.UNAUTHORIZED, 'User not found');
    }

    // Revoke old refresh token (rotation)
    await this.utils.revokeRefreshToken(dto.refreshToken);

    // Generate new access + refresh tokens
    const tokenPair = await this.utils.generateTokenPairAndSave({
      sub: user._id,
      email: user.email,
      role: user.role,
    });

    return successResponse(tokenPair, 'Token refreshed successfully');
  }
}

import { UserResponseDto } from '@/common/dto/user-response.dto';
import { ENVEnum } from '@/common/enum/env.enum';
import { JWTPayload, TokenPair } from '@/core/jwt/jwt.interface';
import { OtpType } from '@/lib/database/enums';
import {
  RefreshToken,
  RefreshTokenDocument,
} from '@/lib/database/schemas/refresh-token.schema';
import {
  UserOtp,
  UserOtpDocument,
} from '@/lib/database/schemas/user-otp.schema';
import { User, UserDocument } from '@/lib/database/schemas/user.schema';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { plainToInstance } from 'class-transformer';
import { randomBytes, randomInt } from 'crypto';
import { Model } from 'mongoose';

@Injectable()
export class AuthUtilsService {
  private saltRounds = 10;
  private refreshTokenDays = 30;
  private refreshTokenLength = 32;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(RefreshToken.name)
    private readonly refreshTokenModel: Model<RefreshTokenDocument>,
    @InjectModel(UserOtp.name)
    private readonly userOtpModel: Model<UserOtpDocument>,
  ) {}

  async sanitizeUser<T = UserResponseDto>(user: any): Promise<T> {
    if (!user) return null as T;

    // Handle Mongoose document
    const userObj = user.toObject ? user.toObject() : user;

    let profilePictureUrl = null;
    if (
      userObj.profilePictureId &&
      typeof userObj.profilePictureId === 'object'
    ) {
      // It's populated
      profilePictureUrl = (userObj.profilePictureId as any).url;
      // Restore ID
      userObj.profilePictureId = (userObj.profilePictureId as any)._id;
    } else if (userObj.profilePicture) {
      // If populated via virtual or manual assignment
      profilePictureUrl = userObj.profilePicture.url;
    }

    const flatData = {
      ...userObj,
      profilePictureId: userObj.profilePictureId ?? null,
      profilePictureUrl,
    };

    return plainToInstance(UserResponseDto, flatData, {
      excludeExtraneousValues: true,
    }) as T;
  }

  generateToken(payload: JWTPayload): string {
    const token = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow(ENVEnum.JWT_SECRET),
      expiresIn: this.configService.getOrThrow(ENVEnum.JWT_EXPIRES_IN),
    });

    return token;
  }

  async generateTokenPairAndSave(payload: JWTPayload): Promise<TokenPair> {
    const accessToken = this.generateToken(payload);

    const refreshToken = randomBytes(
      Math.max(32, Math.floor(this.refreshTokenLength / 2)),
    ).toString('hex');

    const refreshTokenExpiresAt = new Date(
      Date.now() + this.refreshTokenDays * 24 * 60 * 60 * 1000,
    );

    await this.refreshTokenModel.create({
      token: refreshToken,
      userId: payload.sub,
      expiresAt: refreshTokenExpiresAt,
    });

    return {
      accessToken,
      refreshToken,
      refreshTokenExpiresAt,
    };
  }

  verifyToken<T extends object = any>(token: string): T {
    const secret = this.configService.getOrThrow<string>(ENVEnum.JWT_SECRET);
    try {
      return this.jwtService.verify<T>(token, { secret });
    } catch (err) {
      console.error(err);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  decodeToken(token: string): any {
    return this.jwtService.decode(token);
  }

  async revokeRefreshToken(token: string) {
    await this.refreshTokenModel.deleteMany({ token });
  }

  async revokeAllRefreshTokensForUser(userId: string) {
    await this.refreshTokenModel.deleteMany({ userId });
  }

  async findRefreshToken(token: string) {
    return this.refreshTokenModel.findOne({ token });
  }

  generateOtpAndExpiry(minutes = 5): { otp: number; expiryTime: Date } {
    const otp = randomInt(1000, 10000);
    const expiryTime = new Date(Date.now() + minutes * 60 * 1000);
    return { otp, expiryTime };
  }

  async generateOTPAndSave(userId: string, type: OtpType) {
    const { otp, expiryTime } = this.generateOtpAndExpiry();
    const hashedOtp = await this.hash(otp.toString());
    await this.userOtpModel.create({
      userId,
      code: hashedOtp,
      type,
      expiresAt: expiryTime,
    });
    return otp;
  }

  async getSanitizedUserById(id: string) {
    const user = await this.userModel.findById(id).populate('profilePictureId');
    if (!user) throw new Error('User not found');

    return this.sanitizeUser<UserResponseDto>(user);
  }

  async getUserByEmail(email: string) {
    const user = await this.userModel
      .findOne({ email })
      .populate('profilePictureId');

    if (!user) return null;

    return this.sanitizeUser<UserResponseDto>(user);
  }

  async hash(value: string): Promise<string> {
    return bcrypt.hash(value, this.saltRounds);
  }

  async compare(value: string, hash: string): Promise<boolean> {
    return bcrypt.compare(value, hash);
  }
}

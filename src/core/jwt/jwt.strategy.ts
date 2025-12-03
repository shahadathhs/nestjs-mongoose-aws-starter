import { ENVEnum } from '@/common/enum/env.enum';
import { User } from '@/lib/database/schemas/user.schema';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { PassportStrategy } from '@nestjs/passport';
import { Model } from 'mongoose';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JWTPayload } from './jwt.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly config: ConfigService,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {
    const jwtSecret = config.getOrThrow<string>(ENVEnum.JWT_SECRET);

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: JWTPayload) {
    const user = await this.userModel.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Update lastActiveAt on each request
    await this.userModel.findByIdAndUpdate(payload.sub, {
      lastActiveAt: new Date(),
    });

    // Return payload for req.user
    return payload;
  }
}

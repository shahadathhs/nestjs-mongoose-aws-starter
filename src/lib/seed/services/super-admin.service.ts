import { ENVEnum } from '@/common/enum/env.enum';
import { User } from '@/lib/database/schemas/user.schema';
import { AuthUtilsService } from '@/lib/utils/services/auth-utils.service';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class SuperAdminService implements OnModuleInit {
  private readonly logger = new Logger(SuperAdminService.name);

  constructor(
    @InjectModel(User.name) protected readonly userModel: Model<User>,
    private readonly authUtils: AuthUtilsService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit(): Promise<void> {
    return this.seedSuperAdminUser();
  }

  async seedSuperAdminUser(): Promise<void> {
    const superAdminEmail = this.configService.getOrThrow<string>(
      ENVEnum.SUPER_ADMIN_EMAIL,
    );
    const superAdminPass = this.configService.getOrThrow<string>(
      ENVEnum.SUPER_ADMIN_PASS,
    );

    const superAdminExists = await this.userModel.findOne({
      where: {
        email: superAdminEmail,
      },
    });

    // * create super admin
    if (!superAdminExists) {
      await this.userModel.create({
        name: 'Super Admin',
        email: superAdminEmail,
        password: await this.authUtils.hash(superAdminPass),
        role: 'SUPER_ADMIN',
        isVerified: true,
        lastLoginAt: new Date(),
        lastActiveAt: new Date(),
      });
      this.logger.log(
        `[CREATE] Super Admin user created with email: ${superAdminEmail}`,
      );
      return;
    }

    // * Log & update if super admin already exists
    await this.userModel.updateOne(
      { email: superAdminEmail },
      {
        $set: {
          isVerified: true,
          role: 'SUPER_ADMIN',
          lastActiveAt: new Date(),
          lastLoginAt: new Date(),
        },
      },
    );

    this.logger.log(
      `[UPDATE] Super Admin user updated with email: ${superAdminEmail}`,
    );
  }
}

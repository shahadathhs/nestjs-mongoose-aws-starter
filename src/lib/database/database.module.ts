import { ENVEnum } from '@/common/enum/env.enum';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import {
  FileInstance,
  FileInstanceSchema,
} from './schemas/file-instance.schema';
import {
  Notification,
  NotificationSchema,
  UserNotification,
  UserNotificationSchema,
} from './schemas/notification.schema';
import {
  PrivateCall,
  PrivateCallParticipant,
  PrivateCallParticipantSchema,
  PrivateCallSchema,
} from './schemas/private-call.schema';
import {
  PrivateConversation,
  PrivateConversationSchema,
} from './schemas/private-conversation.schema';
import {
  PrivateMessage,
  PrivateMessageSchema,
  PrivateMessageStatus,
  PrivateMessageStatusSchema,
} from './schemas/private-message.schema';
import {
  RefreshToken,
  RefreshTokenSchema,
} from './schemas/refresh-token.schema';
import { UserOtp, UserOtpSchema } from './schemas/user-otp.schema';
import { User, UserSchema } from './schemas/user.schema';

@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>(ENVEnum.DATABASE_URL),
      }),
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: UserOtp.name, schema: UserOtpSchema },
      { name: RefreshToken.name, schema: RefreshTokenSchema },
      { name: FileInstance.name, schema: FileInstanceSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: UserNotification.name, schema: UserNotificationSchema },
      { name: PrivateConversation.name, schema: PrivateConversationSchema },
      { name: PrivateMessage.name, schema: PrivateMessageSchema },
      { name: PrivateMessageStatus.name, schema: PrivateMessageStatusSchema },
      { name: PrivateCall.name, schema: PrivateCallSchema },
      {
        name: PrivateCallParticipant.name,
        schema: PrivateCallParticipantSchema,
      },
    ]),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}

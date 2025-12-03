import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { OtpType } from '../enums';

export type UserOtpDocument = HydratedDocument<UserOtp>;

@Schema({ timestamps: true, collection: 'user_otps' })
export class UserOtp {
  @Prop({ default: () => new Types.ObjectId().toString() })
  _id: string;

  @Prop({ required: true })
  code: string;

  @Prop({ type: String, enum: OtpType, required: true })
  type: OtpType;

  @Prop({ type: String, ref: 'User', required: true, index: true })
  userId: string;

  @Prop({ required: true })
  expiresAt: Date;
}

export const UserOtpSchema = SchemaFactory.createForClass(UserOtp);

UserOtpSchema.virtual('id').get(function () {
  return this._id;
});

UserOtpSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete (ret as any)._id;
  },
});

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type NotificationDocument = HydratedDocument<Notification>;

@Schema({ timestamps: true, collection: 'notifications' })
export class Notification {
  @Prop({ default: () => new Types.ObjectId().toString() })
  _id: string;

  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ type: Object })
  meta: any;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.virtual('id').get(function () {
  return this._id;
});

NotificationSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete (ret as any)._id;
  },
});

export type UserNotificationDocument = HydratedDocument<UserNotification>;

@Schema({ timestamps: true, collection: 'user_notifications' })
export class UserNotification {
  @Prop({ default: () => new Types.ObjectId().toString() })
  _id: string;

  @Prop({ type: String, ref: 'User', required: true })
  userId: string;

  @Prop({ type: String, ref: 'Notification', required: true })
  notificationId: string;

  @Prop({ default: false })
  read: boolean;
}

export const UserNotificationSchema =
  SchemaFactory.createForClass(UserNotification);

UserNotificationSchema.index(
  { userId: 1, notificationId: 1 },
  { unique: true },
);

UserNotificationSchema.virtual('id').get(function () {
  return this._id;
});

UserNotificationSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete (ret as any)._id;
  },
});

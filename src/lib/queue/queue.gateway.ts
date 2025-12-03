import { QueueEventsEnum } from '@/common/enum/queue-events.enum';
import { BaseGateway } from '@/core/socket/base.gateway';
import {
  Notification,
  UserNotification,
} from '@/lib/database/schemas/notification.schema';
import { User } from '@/lib/database/schemas/user.schema';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { WebSocketGateway } from '@nestjs/websockets';
import { Model } from 'mongoose';
import { Socket } from 'socket.io';
import { NotificationPayload } from './interface/queue.payload';

@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:5173',
      'http://localhost:5174',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  },
  namespace: '/queue',
})
@Injectable()
export class QueueGateway extends BaseGateway {
  constructor(
    protected readonly configService: ConfigService,
    @InjectModel(User.name) protected readonly userModel: Model<User>,
    protected readonly jwtService: JwtService,
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<Notification>,
    @InjectModel(UserNotification.name)
    private readonly userNotificationModel: Model<UserNotification>,
  ) {
    super(configService, userModel, jwtService, QueueGateway.name);
  }

  /** --- NOTIFICATIONS --- */
  public getClients(userId: string): Set<Socket> {
    return this.clients.get(userId) || new Set();
  }

  public async notifySingleUser(
    userId: string,
    event: QueueEventsEnum,
    data: NotificationPayload,
  ) {
    const clients = this.getClients(userId);

    // Create notification
    const notification = await this.notificationModel.create({
      type: data.type,
      title: data.title,
      message: data.message,
      meta: data.meta ?? {},
    });

    // Create user notification link
    await this.userNotificationModel.create({
      userId,
      notificationId: notification._id,
    });

    const payload = { ...data, notificationId: notification._id };
    clients.forEach((client) => client.emit(event, payload));
    this.logger.log(`Notification sent to user ${userId} via ${event}`);
  }

  public async notifyMultipleUsers(
    userIds: string[],
    event: QueueEventsEnum,
    data: NotificationPayload,
  ) {
    userIds.forEach((id) => this.notifySingleUser(id, event, data));
  }

  public async notifyAllUsers(
    event: QueueEventsEnum,
    data: NotificationPayload,
  ) {
    // Get all users from DB
    const users = await this.userModel.find().select('_id').lean();

    // Create notification
    const notification = await this.notificationModel.create({
      type: data.type,
      title: data.title,
      message: data.message,
      meta: data.meta ?? {},
    });

    // Create user notification links for all users
    await this.userNotificationModel.insertMany(
      users.map((u) => ({
        userId: u._id,
        notificationId: notification._id,
      })),
    );

    // Check if any user is connected
    const userIds = Array.from(this.clients.keys());
    if (userIds.length === 0) {
      this.logger.warn('No users connected for notifyAllUsers');
      return;
    }

    // Add notificationId to payload
    const payload = { ...data, notificationId: notification._id };

    // Emit to all connected clients
    this.clients.forEach((clients) =>
      clients.forEach((client) => client.emit(event, payload)),
    );

    this.logger.log(`Notification stored & sent to all users via ${event}`);
  }

  public async emitToAdmins(event: QueueEventsEnum, data: NotificationPayload) {
    const admins = await this.userModel
      .find({ role: { $in: ['ADMIN', 'SUPER_ADMIN'] } })
      .select('_id')
      .lean();

    if (!admins.length) return this.logger.warn('No admins found');

    // Create notification
    const notification = await this.notificationModel.create({
      type: data.type,
      title: data.title,
      message: data.message,
      meta: data.meta ?? {},
    });

    // Create user notification links for all admins
    await this.userNotificationModel.insertMany(
      admins.map((a) => ({
        userId: a._id,
        notificationId: notification._id,
      })),
    );

    const payload = { ...data, notificationId: notification._id };
    admins.forEach((a) =>
      this.getClients(a._id).forEach((c) => c.emit(event, payload)),
    );

    this.logger.log(
      `Notification sent to ${admins.length} admins via ${event}`,
    );
  }
}

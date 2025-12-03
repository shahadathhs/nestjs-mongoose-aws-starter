import { User } from '@/lib/database/schemas/user.schema';

export interface GenericPayload {
  adminId: string;
  message: string;
  admin: User;
}

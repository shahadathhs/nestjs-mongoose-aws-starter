import { Module } from '@nestjs/common';
import { ChatModule } from './chat/chat.module';
import { DatabaseModule } from './database/database.module';
import { FileModule } from './file/file.module';
import { MailModule } from './mail/mail.module';
import { QueueModule } from './queue/queue.module';
import { SeedModule } from './seed/seed.module';
import { UtilsModule } from './utils/utils.module';

@Module({
  imports: [
    DatabaseModule,
    FileModule,
    MailModule,
    SeedModule,
    UtilsModule,
    QueueModule,
    ChatModule,
  ],
  exports: [],
  providers: [],
})
export class LibModule {}

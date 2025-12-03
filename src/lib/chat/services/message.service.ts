import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { ChatGateway } from '../chat.gateway';

@Injectable()
export class MessageService {
  constructor(
    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway: ChatGateway,
  ) {}
}

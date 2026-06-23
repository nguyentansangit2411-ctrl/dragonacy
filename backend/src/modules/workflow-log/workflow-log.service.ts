import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { LogLevel } from '@prisma/client';

@Injectable()
export class WorkflowLogService {
  constructor(private readonly prisma: PrismaService) {}

  async log(level: LogLevel, context: string, message: string, details?: any) {
    return this.prisma.workflowLog.create({
      data: {
        level,
        context,
        message,
        details: details ? JSON.parse(JSON.stringify(details)) : undefined,
      },
    });
  }

  async info(context: string, message: string, details?: any) {
    return this.log(LogLevel.INFO, context, message, details);
  }

  async warn(context: string, message: string, details?: any) {
    return this.log(LogLevel.WARN, context, message, details);
  }

  async error(context: string, message: string, details?: any) {
    return this.log(LogLevel.ERROR, context, message, details);
  }
}

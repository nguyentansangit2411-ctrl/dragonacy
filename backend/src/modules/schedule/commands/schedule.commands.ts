import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { CreateScheduleDto } from '../dto/create-schedule.dto';

// Create Schedule Command
export class CreateScheduleCommand {
  constructor(public readonly dto: CreateScheduleDto) {}
}

@CommandHandler(CreateScheduleCommand)
export class CreateScheduleHandler implements ICommandHandler<CreateScheduleCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: CreateScheduleCommand) {
    const { dto } = command;

    // Verify draft and page exist
    await this.prisma.postDraft.findUniqueOrThrow({ where: { id: dto.postDraftId } });
    await this.prisma.facebookPage.findUniqueOrThrow({ where: { id: dto.facebookPageId } });

    // Mark post draft status as SCHEDULED
    await this.prisma.postDraft.update({
      where: { id: dto.postDraftId },
      data: { status: 'SCHEDULED' },
    });

    return this.prisma.schedule.create({
      data: {
        postDraftId: dto.postDraftId,
        facebookPageId: dto.facebookPageId,
        postTime: new Date(dto.postTime),
        status: 'PENDING',
      },
    });
  }
}

// Cancel Schedule Command
export class CancelScheduleCommand {
  constructor(public readonly id: string) {}
}

@CommandHandler(CancelScheduleCommand)
export class CancelScheduleHandler implements ICommandHandler<CancelScheduleCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: CancelScheduleCommand) {
    const { id } = command;

    const schedule = await this.prisma.schedule.findUniqueOrThrow({
      where: { id },
    });

    // Delete schedule
    await this.prisma.schedule.delete({
      where: { id },
    });

    // Check if there are other pending schedules for this draft
    const remaining = await this.prisma.schedule.count({
      where: {
        postDraftId: schedule.postDraftId,
        status: 'PENDING',
      },
    });

    if (remaining === 0) {
      await this.prisma.postDraft.update({
        where: { id: schedule.postDraftId },
        data: { status: 'DRAFT' },
      });
    }

    return { id, cancelled: true };
  }
}

export const ScheduleCommandHandlers = [
  CreateScheduleHandler,
  CancelScheduleHandler,
];

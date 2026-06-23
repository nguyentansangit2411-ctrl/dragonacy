import { CommandHandler, ICommandHandler, CommandBus } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { WorkflowLogService } from '../../workflow-log/workflow-log.service';
import { CreateAutoPostLinksDto } from '../dto/create-auto-post-links.dto';
import { ScrapeProductCommand } from '../../product/commands/product.commands';
import { GeneratePostDraftCommand } from '../../post-draft/commands/post-draft.commands';

// 1. Create Auto Post Links Command
export class CreateAutoPostLinksCommand {
  constructor(public readonly dto: CreateAutoPostLinksDto) {}
}

@CommandHandler(CreateAutoPostLinksCommand)
export class CreateAutoPostLinksHandler implements ICommandHandler<CreateAutoPostLinksCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: CreateAutoPostLinksCommand) {
    const { dto } = command;
    const data = dto.urls
      .map(url => url.trim())
      .filter(url => url.startsWith('http'))
      .map(url => ({
        url,
        status: 'PENDING',
      }));

    if (data.length === 0) return { count: 0 };

    return this.prisma.autoPostLink.createMany({
      data,
    });
  }
}

// 2. Delete Auto Post Link Command
export class DeleteAutoPostLinkCommand {
  constructor(public readonly id: string) {}
}

@CommandHandler(DeleteAutoPostLinkCommand)
export class DeleteAutoPostLinkHandler implements ICommandHandler<DeleteAutoPostLinkCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: DeleteAutoPostLinkCommand) {
    return this.prisma.autoPostLink.delete({
      where: { id: command.id },
    });
  }
}

// 3. Clear Auto Post Links Command
export class ClearAutoPostLinksCommand {}

@CommandHandler(ClearAutoPostLinksCommand)
export class ClearAutoPostLinksHandler implements ICommandHandler<ClearAutoPostLinksCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute() {
    return this.prisma.autoPostLink.deleteMany({});
  }
}

// 4. Trigger Auto Post Workflow Command
export class TriggerAutoPostWorkflowCommand {}

@CommandHandler(TriggerAutoPostWorkflowCommand)
export class TriggerAutoPostWorkflowHandler implements ICommandHandler<TriggerAutoPostWorkflowCommand> {
  private readonly logger = new Logger(TriggerAutoPostWorkflowHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly commandBus: CommandBus,
    private readonly logService: WorkflowLogService,
  ) {}

  async execute() {
    this.logger.log('Bắt đầu quy trình tự động đăng bài (Auto-Post Workflow)...');

    // 1. Check if there are active Facebook pages connected
    const activePage = await this.prisma.facebookPage.findFirst({
      where: { isActive: true },
    });
    if (!activePage) {
      const errMsg = 'Không tìm thấy trang Facebook nào đang hoạt động để lên lịch đăng bài.';
      this.logger.warn(errMsg);
      await this.logService.warn('AutoPostWorkflow', errMsg);
      return { success: false, reason: 'NO_ACTIVE_FB_PAGE' };
    }

    // 2. Fetch the next pending link
    const pendingLink = await this.prisma.autoPostLink.findFirst({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });

    if (!pendingLink) {
      const infoMsg = 'Hàng đợi link rỗng. Không có sản phẩm nào cần xử lý.';
      this.logger.log(infoMsg);
      await this.logService.info('AutoPostWorkflow', infoMsg);
      return { success: false, reason: 'QUEUE_EMPTY' };
    }

    this.logger.log(`Xử lý link hàng đợi: ${pendingLink.url}`);
    
    // 3. Lock status to PROCESSING
    await this.prisma.autoPostLink.update({
      where: { id: pendingLink.id },
      data: { status: 'PROCESSING', errorMessage: null },
    });

    try {
      // 4. Run Scraper via CommandBus
      const scrapedData = await this.commandBus.execute(
        new ScrapeProductCommand([pendingLink.url]),
      );

      if (!scrapedData || !scrapedData.title || scrapedData.title === 'Sản phẩm mới nhập') {
        throw new Error('Cào thông tin sản phẩm thất bại hoặc không lấy được tiêu đề thực tế.');
      }

      // 5. Auto-select up to 5 images
      const selectedImages = (scrapedData.images || []).slice(0, 5);

      // 6. Generate Affiliate URL from template if configured
      let affiliateUrl = pendingLink.url;
      const template = process.env.AFFILIATE_LINK_TEMPLATE;
      if (template) {
        affiliateUrl = template
          .replace(/{url}/g, encodeURIComponent(pendingLink.url))
          .replace(/{productUrl}/g, encodeURIComponent(pendingLink.url));
      }

      // 7. Create Product record
      const product = await this.prisma.product.create({
        data: {
          title: scrapedData.title,
          description: scrapedData.description,
          affiliateUrl: affiliateUrl,
          imageUrl: selectedImages[0] || null,
          rawContent: scrapedData.rawContent,
          metadata: { images: selectedImages },
        },
      });

      // 8. Generate Post Draft using Gemini AI
      const postDraft = await this.commandBus.execute(
        new GeneratePostDraftCommand({
          productId: product.id,
          customInstruction: 'Hãy viết theo chuẩn khuôn mẫu đánh giá sản phẩm chuyên nghiệp mới.',
        }),
      );

      // 9. Schedule for immediate execution (postTime: now)
      const schedule = await this.prisma.schedule.create({
        data: {
          postDraftId: postDraft.id,
          facebookPageId: activePage.id,
          postTime: new Date(),
          status: 'PENDING',
        },
      });

      // 10. Update link to COMPLETED
      await this.prisma.autoPostLink.update({
        where: { id: pendingLink.id },
        data: { status: 'COMPLETED' },
      });

      const successMsg = `Đã hoàn thành tự động hóa cho link: ${pendingLink.url}. Sản phẩm ID: ${product.id}, Schedule ID: ${schedule.id}`;
      this.logger.log(successMsg);
      await this.logService.info('AutoPostWorkflow', successMsg, {
        productId: product.id,
        scheduleId: schedule.id,
        linkId: pendingLink.id,
      });

      return { success: true, scheduleId: schedule.id };
    } catch (error: any) {
      const errorMsg = error?.message || 'Lỗi không xác định trong luồng Auto-Post.';
      this.logger.error(`AutoPostWorkflow thất bại cho link ${pendingLink.url}: ${errorMsg}`, error);
      
      // Update link status to FAILED with error message
      await this.prisma.autoPostLink.update({
        where: { id: pendingLink.id },
        data: { status: 'FAILED', errorMessage: errorMsg },
      });

      await this.logService.error('AutoPostWorkflow', `Lỗi xử lý link ${pendingLink.url}: ${errorMsg}`, {
        linkId: pendingLink.id,
        stack: error?.stack,
      });

      return { success: false, reason: 'ERROR', error: errorMsg };
    }
  }
}

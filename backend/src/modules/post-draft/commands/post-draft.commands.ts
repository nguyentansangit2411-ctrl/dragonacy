import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { AIProvider } from '../../../core/ai/ai-provider.interface';
import { CreatePostDraftDto } from '../dto/create-post-draft.dto';
import { UpdatePostDraftDto } from '../dto/update-post-draft.dto';
import { GeneratePostDraftDto } from '../dto/generate-post-draft.dto';

// Create Post Draft Command
export class CreatePostDraftCommand {
  constructor(public readonly dto: CreatePostDraftDto) {}
}

@CommandHandler(CreatePostDraftCommand)
export class CreatePostDraftHandler implements ICommandHandler<CreatePostDraftCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: CreatePostDraftCommand) {
    const { dto } = command;
    return this.prisma.postDraft.create({
      data: {
        productId: dto.productId || null,
        content: dto.content,
        mediaUrls: dto.mediaUrls || [],
        status: dto.status || 'DRAFT',
      },
    });
  }
}

// Update Post Draft Command
export class UpdatePostDraftCommand {
  constructor(
    public readonly id: string,
    public readonly dto: UpdatePostDraftDto,
  ) {}
}

@CommandHandler(UpdatePostDraftCommand)
export class UpdatePostDraftHandler implements ICommandHandler<UpdatePostDraftCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: UpdatePostDraftCommand) {
    const { id, dto } = command;
    return this.prisma.postDraft.update({
      where: { id },
      data: {
        productId: dto.productId !== undefined ? dto.productId : undefined,
        content: dto.content,
        mediaUrls: dto.mediaUrls,
        status: dto.status,
      },
    });
  }
}

// Delete Post Draft Command
export class DeletePostDraftCommand {
  constructor(public readonly id: string) {}
}

@CommandHandler(DeletePostDraftCommand)
export class DeletePostDraftHandler implements ICommandHandler<DeletePostDraftCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: DeletePostDraftCommand) {
    const { id } = command;
    return this.prisma.postDraft.delete({
      where: { id },
    });
  }
}

// Generate Post Draft Command
export class GeneratePostDraftCommand {
  constructor(public readonly dto: GeneratePostDraftDto) {}
}

@CommandHandler(GeneratePostDraftCommand)
export class GeneratePostDraftHandler implements ICommandHandler<GeneratePostDraftCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiProvider: AIProvider,
  ) {}

  async execute(command: GeneratePostDraftCommand) {
    const { dto } = command;
    const product = await this.prisma.product.findUniqueOrThrow({
      where: { id: dto.productId },
    });

    const basePrompt = `Hãy viết một bài đánh giá và giới thiệu sản phẩm giày cầu lông chuyên nghiệp bằng tiếng Việt để đăng lên Facebook. Dựa trên thông tin sản phẩm thu thập được dưới đây, hãy phân tích một cách chi tiết, khách quan, tránh văn phong quá sến súa, tự xưng sáo rỗng hoặc cường điệu quá mức.

Bài viết BẮT BUỘC phải tuân thủ đúng cấu trúc và định dạng sau đây (hãy thay thế nội dung trong ngoặc vuông bằng thông tin phân tích thực tế, và TUYỆT ĐỐI KHÔNG giữ lại các ký tự ngoặc vuông '[]' trong bài đăng):

[TÊN GIÀY CẦU LÔNG - Viết In Hoa]

1. Thông số & Thiết kế cơ bản
Thương hiệu & Giá: [Hãng giày - Khoảng giá VNĐ]
Form giày: [Tiêu chuẩn / Chân bè (Wide) / Chân gầy (Slim)]
Ấn tượng ngoại hình: [Đánh giá màu sắc, tính thẩm mỹ, độ hoàn thiện ngoại hình]

2. Trải nghiệm thực tế trên sân
Độ vừa vặn & Thoải mái: [Phân tích xem giày có ôm chân tốt không? Có bị cấn hay bí bách khi chơi cường độ cao không?]
Độ êm & Giảm chấn: [Cảm giác khi bật nhảy và tiếp đất thế nào? Khả năng giảm chấn và giảm áp lực lên gót/ức chân có tốt không?]
Độ bám & Chống lật: [Di chuyển nhanh có vững vàng không? Có bị trượt thảm không? Khả năng chống lật cổ chân thế nào?]

3. Ưu điểm & Nhược điểm
Ưu điểm:
- [Liệt kê 2-3 ưu điểm nổi bật nhất]
Nhược điểm:
- [Liệt kê 1-2 điểm chưa hài lòng hoặc cần lưu ý khi mua/sử dụng]

4. Kết luận & Tư vấn size
Đánh giá chung: [Đánh giá tổng quan xem giày có đáng tiền không và phù hợp cho đối tượng nào (học sinh, phong trào, bán chuyên, chuyên nghiệp)?]
Chọn size: [Lời khuyên chọn size, nên đi đúng size (true size) hay cần tăng/giảm size?]

👇 Link chi tiết sản phẩm và nơi mua chính hãng ở bình luận đầu tiên nhé cả nhà!

[Các hashtag liên quan ở đây, ví dụ: #GiayCauLong #TenGiay #HvShop #ShopVNB]

---
Thông tin sản phẩm để phân tích:
Tên sản phẩm: ${product.title}
Mô tả sản phẩm: ${product.description || 'Không có mô tả.'}

YÊU CẦU QUAN TRỌNG:
1. Không giữ lại các dấu ngoặc vuông \`[]\`. Hãy viết nội dung phân tích cụ thể, mạch lạc thay thế vào đó.
2. Không thêm bất kỳ câu hội thoại chào hỏi, giới thiệu ở đầu (ví dụ: "Chào các bạn...", "Dưới đây là...") hoặc lời kết ở cuối bài. Trả về đúng và duy nhất nội dung bài đăng theo định dạng cấu trúc trên.`;

    const prompt = dto.customInstruction
      ? `${basePrompt}\n\nAdditional instructions: ${dto.customInstruction}`
      : basePrompt;

    const result = await this.aiProvider.generateContent(prompt);

    if (result.safetyBlocked) {
      throw new Error('AI content generation blocked due to safety flags.');
    }

    // Clean up content from any conversational greetings or preambles
    let cleanedContent = result.text.trim();
    cleanedContent = cleanedContent
      .replace(/^(Tuyệt vời!|Dưới đây là|Đây là gợi ý|Dưới đây là nội dung|Chào bạn|Chúc bạn).*?:\n*/i, '')
      .replace(/^---\s*\n*/, '')
      .replace(/\n*---\s*$/, '')
      .replace(/^(Hy vọng bài viết|Chúc bạn thành công|Dưới đây là bài đăng).*$/im, '')
      .trim();

    // Load multiple images from product metadata, fallback to product.imageUrl
    const mediaUrls = (product.metadata as any)?.images || (product.imageUrl ? [product.imageUrl] : []);

    return this.prisma.postDraft.create({
      data: {
        productId: product.id,
        content: cleanedContent,
        mediaUrls,
        status: 'DRAFT',
      },
    });
  }
}

// Publish Post Draft Command (Immediate manual post)
export class PublishPostDraftCommand {
  constructor(
    public readonly draftId: string,
    public readonly facebookPageId: string,
  ) {}
}

@CommandHandler(PublishPostDraftCommand)
export class PublishPostDraftHandler implements ICommandHandler<PublishPostDraftCommand> {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async execute(command: PublishPostDraftCommand) {
    const { draftId, facebookPageId } = command;

    // 1. Fetch draft, product and facebook page
    const draft = await this.prisma.postDraft.findUniqueOrThrow({
      where: { id: draftId },
      include: { product: true },
    });

    const page = await this.prisma.facebookPage.findUniqueOrThrow({
      where: { id: facebookPageId },
    });

    if (!page.isActive) {
      throw new Error('The chosen Facebook Page is marked inactive.');
    }

    // 2. Create schedule entry in database to track the execution status (awaiting local worker)
    const schedule = await this.prisma.schedule.create({
      data: {
        postDraftId: draftId,
        facebookPageId: facebookPageId,
        postTime: new Date(),
        status: 'AWAITING_WORKER',
      },
    });

    // 3. Mark post draft status as SCHEDULED
    await this.prisma.postDraft.update({
      where: { id: draftId },
      data: { status: 'SCHEDULED' },
    });

    return schedule;
  }
}

export const PostDraftCommandHandlers = [
  CreatePostDraftHandler,
  UpdatePostDraftHandler,
  DeletePostDraftHandler,
  GeneratePostDraftHandler,
  PublishPostDraftHandler,
];

import { Test, TestingModule } from '@nestjs/testing';
import { PostProcessor } from './post.processor';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowLogService } from '../../modules/workflow-log/workflow-log.service';
import { Job } from 'bullmq';

describe('PostProcessor', () => {
  let processor: PostProcessor;
  let prismaService: PrismaService;
  let logService: WorkflowLogService;

  const mockSchedule = {
    id: 'schedule-uuid-1',
    postDraftId: 'draft-uuid-1',
    facebookPageId: 'page-uuid-1',
    postTime: new Date(),
    status: 'PROCESSING',
    retryCount: 0,
    facebookPostId: null as string | null,
    facebookCommentId: null as string | null,
    errorMessage: null as string | null,
    facebookPage: {
      id: 'page-uuid-1',
      pageId: 'fb-page-123',
      pageName: 'Tech Deals Page',
      isActive: true,
    },
    postDraft: {
      id: 'draft-uuid-1',
      content: 'Check out this awesome gaming keyboard!',
      mediaUrls: ['https://example.com/keyboard.jpg'],
      product: {
        id: 'product-uuid-1',
        affiliateUrl: 'https://amzn.to/keyboard-deal',
      },
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostProcessor,
        {
          provide: PrismaService,
          useValue: {
            schedule: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: WorkflowLogService,
          useValue: {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    processor = module.get<PostProcessor>(PostProcessor);
    prismaService = module.get<PrismaService>(PrismaService);
    logService = module.get<WorkflowLogService>(WorkflowLogService);
  });

  const createMockJob = (attemptsMade = 0, maxAttempts = 5): Job => {
    return {
      data: { scheduleId: 'schedule-uuid-1' },
      attemptsMade,
      opts: {
        attempts: maxAttempts,
      },
    } as unknown as Job;
  };

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  it('should successfully transition an active schedule to AWAITING_WORKER', async () => {
    const job = createMockJob(0);
    
    jest.spyOn(prismaService.schedule, 'findUnique').mockResolvedValue(mockSchedule as any);
    const updateSpy = jest.spyOn(prismaService.schedule, 'update').mockResolvedValue({} as any);

    await processor.process(job as any);

    expect(updateSpy).toHaveBeenCalledWith({
      where: { id: 'schedule-uuid-1' },
      data: {
        status: 'AWAITING_WORKER',
        errorMessage: null,
      },
    });
    expect(logService.info).toHaveBeenCalled();
  });

  it('should fail the schedule if the target Facebook Page is inactive', async () => {
    const job = createMockJob(0);
    
    const inactiveSchedule = {
      ...mockSchedule,
      facebookPage: {
        ...mockSchedule.facebookPage,
        isActive: false,
      },
    };
    jest.spyOn(prismaService.schedule, 'findUnique').mockResolvedValue(inactiveSchedule as any);
    const updateSpy = jest.spyOn(prismaService.schedule, 'update').mockResolvedValue({} as any);

    await processor.process(job as any);

    expect(updateSpy).toHaveBeenCalledWith({
      where: { id: 'schedule-uuid-1' },
      data: {
        status: 'FAILED',
        errorMessage: expect.stringContaining('is inactive. Quarantining job.'),
      },
    });
    expect(logService.warn).toHaveBeenCalled();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { WorkerController } from './worker.controller';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('WorkerController', () => {
  let controller: WorkerController;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkerController],
      providers: [
        {
          provide: PrismaService,
          useValue: {
            schedule: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    controller = module.get<WorkerController>(WorkerController);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getPendingJobs', () => {
    it('should list and map pending schedules in AWAITING_WORKER status', async () => {
      const mockPendingSchedules = [
        {
          id: 'schedule-1',
          postDraftId: 'draft-1',
          postTime: new Date(),
          status: 'AWAITING_WORKER',
          retryCount: 0,
          errorMessage: null,
          facebookPostId: null,
          facebookCommentId: null,
          facebookPageId: 'page-1',
          facebookPage: {
            pageId: 'fb-page-1',
            pageName: 'Page 1',
          },
          postDraft: {
            content: 'Content 1',
            mediaUrls: ['url1'],
            product: {
              id: 'prod-1',
              title: 'Product 1',
              affiliateUrl: 'http://affiliate/1',
            },
          },
        },
      ];

      jest.spyOn(prisma.schedule, 'findMany').mockResolvedValue(mockPendingSchedules as any);

      const result = await controller.getPendingJobs();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'schedule-1',
        postDraftId: 'draft-1',
        content: 'Content 1',
        mediaUrls: ['url1'],
        productId: 'prod-1',
        productName: 'Product 1',
        affiliateUrl: 'http://affiliate/1',
        facebookPageId: 'page-1',
        pageId: 'fb-page-1',
        pageName: 'Page 1',
        scheduledTime: mockPendingSchedules[0].postTime,
        status: 'AWAITING_WORKER',
        retryCount: 0,
        errorMessage: null,
        facebookPostId: null,
        facebookCommentId: null,
      });
    });
  });

  describe('startJob', () => {
    it('should lock and change job status to PROCESSING', async () => {
      const mockSchedule = { id: 'job-1', status: 'AWAITING_WORKER' };
      jest.spyOn(prisma.schedule, 'findUnique').mockResolvedValue(mockSchedule as any);
      const updateSpy = jest.spyOn(prisma.schedule, 'update').mockResolvedValue({} as any);

      await controller.startJob('job-1');

      expect(updateSpy).toHaveBeenCalledWith({
        where: { id: 'job-1' },
        data: { status: 'PROCESSING' },
      });
    });

    it('should throw NotFoundException if schedule does not exist', async () => {
      jest.spyOn(prisma.schedule, 'findUnique').mockResolvedValue(null);
      await expect(controller.startJob('job-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if job is not in AWAITING_WORKER or PROCESSING status', async () => {
      const mockSchedule = { id: 'job-1', status: 'SUCCESS' };
      jest.spyOn(prisma.schedule, 'findUnique').mockResolvedValue(mockSchedule as any);
      await expect(controller.startJob('job-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('completeJob', () => {
    it('should update schedule to SUCCESS status with Facebook post and comment ids', async () => {
      const mockSchedule = { id: 'job-1' };
      jest.spyOn(prisma.schedule, 'findUnique').mockResolvedValue(mockSchedule as any);
      const updateSpy = jest.spyOn(prisma.schedule, 'update').mockResolvedValue({} as any);

      await controller.completeJob('job-1', {
        facebookPostId: 'fb-post-123',
        facebookCommentId: 'fb-comment-456',
      });

      expect(updateSpy).toHaveBeenCalledWith({
        where: { id: 'job-1' },
        data: {
          status: 'SUCCESS',
          facebookPostId: 'fb-post-123',
          facebookCommentId: 'fb-comment-456',
          errorMessage: null,
        },
      });
    });
  });

  describe('failJob', () => {
    it('should update schedule to FAILED status with error message', async () => {
      const mockSchedule = { id: 'job-1' };
      jest.spyOn(prisma.schedule, 'findUnique').mockResolvedValue(mockSchedule as any);
      const updateSpy = jest.spyOn(prisma.schedule, 'update').mockResolvedValue({} as any);

      await controller.failJob('job-1', {
        errorMessage: 'Connection lost',
      });

      expect(updateSpy).toHaveBeenCalledWith({
        where: { id: 'job-1' },
        data: {
          status: 'FAILED',
          errorMessage: 'Connection lost',
        },
      });
    });
  });
});

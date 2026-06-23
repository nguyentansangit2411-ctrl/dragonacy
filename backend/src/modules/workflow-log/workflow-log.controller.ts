import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@ApiTags('Workflow Logs')
@Controller('api/logs')
export class WorkflowLogController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Retrieve workflow execution logs' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of logs to return (default: 50)' })
  @ApiQuery({ name: 'level', required: false, type: String, description: 'Filter by log level (INFO, WARN, ERROR)' })
  @ApiResponse({ status: 200, description: 'List of workflow logs.' })
  async getLogs(
    @Query('limit') limit = 50,
    @Query('level') level?: 'INFO' | 'WARN' | 'ERROR',
  ) {
    return this.prisma.workflowLog.findMany({
      where: level ? { level } : {},
      take: Math.min(Number(limit), 200),
      orderBy: { createdAt: 'desc' },
    });
  }
}

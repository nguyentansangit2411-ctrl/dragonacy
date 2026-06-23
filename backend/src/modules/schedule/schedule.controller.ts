import { Controller, Get, Post, Delete, Body, Param, Query, HttpStatus, HttpCode, ParseUUIDPipe } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { CreateScheduleCommand, CancelScheduleCommand } from './commands/schedule.commands';
import { ListSchedulesQuery } from './queries/schedule.queries';

@ApiTags('Schedules & Queues')
@Controller('api/schedules')
export class ScheduleController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List scheduled publishing runs' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'PENDING, PROCESSING, SUCCESS, FAILED' })
  @ApiResponse({ status: 200, description: 'Queue list retrieved.' })
  async list(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('status') status?: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED',
  ) {
    return this.queryBus.execute(new ListSchedulesQuery(limit, offset, status));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Schedule a post draft for future publication' })
  @ApiResponse({ status: 201, description: 'Schedule created successfully.' })
  async create(@Body() dto: CreateScheduleDto) {
    return this.commandBus.execute(new CreateScheduleCommand(dto));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel/Delete an existing schedule' })
  @ApiParam({ name: 'id', description: 'Schedule UUID' })
  @ApiResponse({ status: 204, description: 'Schedule cancelled.' })
  async delete(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.commandBus.execute(new CancelScheduleCommand(id));
  }
}

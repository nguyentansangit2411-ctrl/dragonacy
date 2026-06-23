import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpStatus, HttpCode, ParseUUIDPipe } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { CreatePostDraftDto } from './dto/create-post-draft.dto';
import { UpdatePostDraftDto } from './dto/update-post-draft.dto';
import { GeneratePostDraftDto } from './dto/generate-post-draft.dto';
import {
  CreatePostDraftCommand,
  UpdatePostDraftCommand,
  DeletePostDraftCommand,
  GeneratePostDraftCommand,
  PublishPostDraftCommand,
} from './commands/post-draft.commands';
import { GetPostDraftQuery, ListPostDraftsQuery } from './queries/post-draft.queries';
import { PostStatus } from '@prisma/client';

@ApiTags('Post Drafts')
@Controller('api/post-drafts')
export class PostDraftController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all post drafts' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: PostStatus })
  @ApiQuery({ name: 'productId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'List of drafts.' })
  async list(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('status') status?: PostStatus,
    @Query('productId') productId?: string,
  ) {
    return this.queryBus.execute(new ListPostDraftsQuery(limit, offset, status, productId));
  }

  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate a new post draft from product using Gemini AI' })
  @ApiResponse({ status: 201, description: 'Post draft generated and saved.' })
  async generate(@Body() dto: GeneratePostDraftDto) {
    return this.commandBus.execute(new GeneratePostDraftCommand(dto));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a single post draft' })
  @ApiParam({ name: 'id', description: 'Post Draft UUID' })
  @ApiResponse({ status: 200, description: 'Draft details.' })
  @ApiResponse({ status: 404, description: 'Draft not found.' })
  async get(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.queryBus.execute(new GetPostDraftQuery(id));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a post draft manually' })
  @ApiResponse({ status: 201, description: 'Draft created successfully.' })
  async create(@Body() dto: CreatePostDraftDto) {
    return this.commandBus.execute(new CreatePostDraftCommand(dto));
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update post draft content/status' })
  @ApiParam({ name: 'id', description: 'Post Draft UUID' })
  @ApiResponse({ status: 200, description: 'Draft updated successfully.' })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdatePostDraftDto,
  ) {
    return this.commandBus.execute(new UpdatePostDraftCommand(id, dto));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a post draft' })
  @ApiParam({ name: 'id', description: 'Post Draft UUID' })
  @ApiResponse({ status: 204, description: 'Draft deleted successfully.' })
  async delete(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.commandBus.execute(new DeletePostDraftCommand(id));
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Publish post draft immediately to Facebook' })
  @ApiParam({ name: 'id', description: 'Post Draft UUID' })
  @ApiResponse({ status: 200, description: 'Draft published successfully.' })
  async publish(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body('facebookPageId', new ParseUUIDPipe()) facebookPageId: string,
  ) {
    return this.commandBus.execute(new PublishPostDraftCommand(id, facebookPageId));
  }
}

import { Controller, Get, Post, Delete, Body, Param, HttpStatus, HttpCode, ParseUUIDPipe } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { CreateAutoPostLinksDto } from './dto/create-auto-post-links.dto';
import { CreateAutoPostLinksCommand, DeleteAutoPostLinkCommand, ClearAutoPostLinksCommand, TriggerAutoPostWorkflowCommand } from './commands/auto-post.commands';
import { ListAutoPostLinksQuery } from './queries/auto-post.queries';

@ApiTags('Auto Post')
@Controller('api/auto-post')
export class AutoPostController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get('links')
  @ApiOperation({ summary: 'Lấy danh sách các liên kết trong hàng đợi đăng tự động' })
  @ApiResponse({ status: 200, description: 'Trả về danh sách các link.' })
  async list() {
    return this.queryBus.execute(new ListAutoPostLinksQuery());
  }

  @Post('links')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Thêm danh sách liên kết sản phẩm vào hàng đợi tự động' })
  @ApiResponse({ status: 201, description: 'Đã thêm thành công các link.' })
  async addLinks(@Body() dto: CreateAutoPostLinksDto) {
    return this.commandBus.execute(new CreateAutoPostLinksCommand(dto));
  }

  @Delete('links/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa một liên kết khỏi hàng đợi đăng tự động' })
  @ApiParam({ name: 'id', description: 'AutoPostLink UUID' })
  @ApiResponse({ status: 200, description: 'Đã xóa liên kết.' })
  async deleteLink(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.commandBus.execute(new DeleteAutoPostLinkCommand(id));
  }

  @Post('links/clear')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa sạch tất cả các liên kết trong hàng đợi tự động' })
  @ApiResponse({ status: 200, description: 'Đã xóa sạch hàng đợi.' })
  async clearLinks() {
    return this.commandBus.execute(new ClearAutoPostLinksCommand());
  }

  @Post('trigger')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Kích hoạt ngay lập tức quy trình tự động hóa cho link tiếp theo' })
  @ApiResponse({ status: 200, description: 'Đã kích hoạt luồng xử lý tự động.' })
  async triggerWorkflow() {
    return this.commandBus.execute(new TriggerAutoPostWorkflowCommand());
  }
}

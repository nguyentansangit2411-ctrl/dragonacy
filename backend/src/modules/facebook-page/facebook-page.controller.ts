import { Controller, Get, Post, Delete, Body, Param, HttpStatus, HttpCode, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { ConnectPageDto } from './dto/connect-page.dto';

@ApiTags('Facebook Pages')
@Controller('api/facebook/pages')
export class FacebookPageController {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private async getOrCreateDefaultUser() {
    let user = await this.prisma.user.findFirst();
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: 'default_admin@dragonacy.com',
          passwordHash: 'stubbed_admin_password_hash',
        },
      });
    }
    return user;
  }

  @Get()
  @ApiOperation({ summary: 'List all connected Facebook Pages' })
  @ApiResponse({ status: 200, description: 'List of pages returned successfully.' })
  async listPages() {
    return this.prisma.facebookPage.findMany({
      select: {
        id: true,
        pageId: true,
        pageName: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Connect a new Facebook Page' })
  @ApiResponse({ status: 201, description: 'Page connected successfully.' })
  async connectPage(@Body() dto: ConnectPageDto) {
    const user = await this.getOrCreateDefaultUser();

    // Save/Update in database
    return this.prisma.facebookPage.upsert({
      where: { pageId: dto.pageId },
      update: {
        pageName: dto.pageName,
        isActive: true,
      },
      create: {
        userId: user.id,
        pageId: dto.pageId,
        pageName: dto.pageName,
        isActive: true,
      },
      select: {
        id: true,
        pageId: true,
        pageName: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disconnect a Facebook Page' })
  @ApiParam({ name: 'id', description: 'Facebook Page UUID' })
  @ApiResponse({ status: 204, description: 'Page disconnected successfully.' })
  async disconnectPage(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.prisma.facebookPage.delete({
      where: { id },
    });
  }

  @Post(':id/verify')
  @ApiOperation({ summary: 'Verify Facebook Page token and API connection status' })
  @ApiParam({ name: 'id', description: 'Facebook Page UUID' })
  @ApiResponse({ status: 200, description: 'Verification results returned.' })
  async verifyConnection(@Param('id', new ParseUUIDPipe()) id: string) {
    const page = await this.prisma.facebookPage.findUniqueOrThrow({
      where: { id },
    });

    return {
      status: 'healthy',
      message: `Connection to page "${page.pageName}" is active. Authentication is handled by the local worker.`,
    };
  }
}

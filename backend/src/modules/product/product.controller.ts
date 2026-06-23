import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpStatus, HttpCode, ParseUUIDPipe } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateProductCommand, UpdateProductCommand, DeleteProductCommand, ScrapeProductCommand } from './commands/product.commands';
import { GetProductQuery, ListProductsQuery } from './queries/product.queries';

@ApiTags('Products')
@Controller('api/products')
export class ProductController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all products with search and pagination' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max number of items to return' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Number of items to skip' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search term matching title or description' })
  @ApiResponse({ status: 200, description: 'List of products returned successfully.' })
  async list(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('search') search?: string,
  ) {
    return this.queryBus.execute(new ListProductsQuery(limit, offset, search));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a single product' })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'Product details returned successfully.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  async get(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.queryBus.execute(new GetProductQuery(id));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({ status: 201, description: 'Product created successfully.' })
  async create(@Body() dto: CreateProductDto) {
    return this.commandBus.execute(new CreateProductCommand(dto));
  }

  @Post('scrape')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Scrape product information from multiple URLs' })
  @ApiResponse({ status: 200, description: 'Product info scraped successfully.' })
  async scrape(@Body('urls') urls: string[]) {
    return this.commandBus.execute(new ScrapeProductCommand(urls));
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an existing product' })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'Product updated successfully.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.commandBus.execute(new UpdateProductCommand(id, dto));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a product' })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiResponse({ status: 244, description: 'Product deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  async delete(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.commandBus.execute(new DeleteProductCommand(id));
  }
}

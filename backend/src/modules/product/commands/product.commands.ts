import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';

// Create Command
export class CreateProductCommand {
  constructor(public readonly dto: CreateProductDto) {}
}

@CommandHandler(CreateProductCommand)
export class CreateProductHandler implements ICommandHandler<CreateProductCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: CreateProductCommand) {
    const { dto } = command;
    return this.prisma.product.create({
      data: {
        title: dto.title,
        description: dto.description,
        affiliateUrl: dto.affiliateUrl,
        imageUrl: dto.imageUrl,
        rawContent: dto.rawContent,
        metadata: dto.metadata || undefined,
      },
    });
  }
}

// Update Command
export class UpdateProductCommand {
  constructor(
    public readonly id: string,
    public readonly dto: UpdateProductDto,
  ) {}
}

@CommandHandler(UpdateProductCommand)
export class UpdateProductHandler implements ICommandHandler<UpdateProductCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: UpdateProductCommand) {
    const { id, dto } = command;
    return this.prisma.product.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        affiliateUrl: dto.affiliateUrl,
        imageUrl: dto.imageUrl,
        rawContent: dto.rawContent,
        metadata: dto.metadata || undefined,
      },
    });
  }
}

// Delete Command
export class DeleteProductCommand {
  constructor(public readonly id: string) {}
}

@CommandHandler(DeleteProductCommand)
export class DeleteProductHandler implements ICommandHandler<DeleteProductCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: DeleteProductCommand) {
    const { id } = command;
    return this.prisma.product.delete({
      where: { id },
    });
  }
}

// Scrape Product Command
export class ScrapeProductCommand {
  constructor(public readonly urls: string[]) {}
}

@CommandHandler(ScrapeProductCommand)
export class ScrapeProductHandler implements ICommandHandler<ScrapeProductCommand> {
  private readonly logger = new Logger(ScrapeProductHandler.name);

  async execute(command: ScrapeProductCommand) {
    const { urls } = command;
    const scrapedData = {
      title: '',
      description: '',
      images: [] as string[],
      rawContent: '',
    };

    const imageSet = new Set<string>();

    for (const url of urls) {
      if (!url || !url.startsWith('http')) continue;
      try {
        this.logger.log(`Scraping product URL: ${url}`);
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });
        if (!response.ok) continue;
        const html = await response.text();

        // 1. Extract title
        let title = '';
        const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/i) ||
                             html.match(/<meta\s+content=["'](.*?)["']\s+property=["']og:title["']/i);
        if (ogTitleMatch && ogTitleMatch[1]) {
          title = ogTitleMatch[1];
        } else {
          const titleMatch = html.match(/<title>(.*?)<\/title>/i);
          if (titleMatch && titleMatch[1]) {
            title = titleMatch[1];
          }
        }
        if (title && !scrapedData.title) {
          // Remove dynamic suffixes like " - ShopVNB", "| AliExpress", etc.
          scrapedData.title = title
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/\s*[-|]\s*ShopVNB\s*$/i, '')
            .replace(/\s*[-|]\s*AliExpress\s*$/i, '')
            .trim();
        }

        // 2. Extract description
        let desc = '';
        const ogDescMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["'](.*?)["']/i) ||
                            html.match(/<meta\s+content=["'](.*?)["']\s+property=["']og:description["']/i) ||
                            html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i);
        if (ogDescMatch && ogDescMatch[1]) {
          desc = ogDescMatch[1];
        }
        if (desc) {
          scrapedData.description += (scrapedData.description ? '\n\n' : '') + desc.replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim();
        }

        // 3. Extract images
        // A. og:image
        const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/i) ||
                             html.match(/<meta\s+content=["'](.*?)["']\s+property=["']og:image["']/i);
        if (ogImageMatch && ogImageMatch[1]) {
          let imgUrl = ogImageMatch[1];
          if (imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl;
          else if (imgUrl.startsWith('/')) {
            const parsedUrl = new URL(url);
            imgUrl = parsedUrl.origin + imgUrl;
          }
          imageSet.add(imgUrl);
        }

        // B. img tags in DOM
        const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
        let match;
        while ((match = imgRegex.exec(html)) !== null) {
          let imgUrl = match[1];
          const lowerUrl = imgUrl.toLowerCase();
          
          // Filter out obvious interface/tracking icons
          if (
            lowerUrl.includes('logo') || 
            lowerUrl.includes('icon') || 
            lowerUrl.includes('avatar') || 
            lowerUrl.includes('banner') ||
            lowerUrl.includes('theme') ||
            lowerUrl.includes('arrow') ||
            lowerUrl.includes('sprite') ||
            lowerUrl.includes('gif') ||
            lowerUrl.includes('svg') ||
            lowerUrl.includes('payment')
          ) {
            continue;
          }

          if (imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl;
          else if (imgUrl.startsWith('/')) {
            const parsedUrl = new URL(url);
            imgUrl = parsedUrl.origin + imgUrl;
          } else if (!imgUrl.startsWith('http')) {
            const parsedUrl = new URL(url);
            const pathParts = parsedUrl.pathname.split('/');
            pathParts.pop();
            imgUrl = parsedUrl.origin + pathParts.join('/') + '/' + imgUrl;
          }

          imageSet.add(imgUrl);
        }

        scrapedData.rawContent += `\n--- URL: ${url} ---\n` + html.replace(/<[^>]*>/g, ' ').substring(0, 5000);

      } catch (err: any) {
        this.logger.error(`Error scraping url ${url}: ${err.message}`);
      }
    }

    scrapedData.images = Array.from(imageSet).slice(0, 12);
    
    if (!scrapedData.title) {
      scrapedData.title = 'Sản phẩm mới nhập';
    }

    return scrapedData;
  }
}

export const ProductCommandHandlers = [
  CreateProductHandler,
  UpdateProductHandler,
  DeleteProductHandler,
  ScrapeProductHandler,
];

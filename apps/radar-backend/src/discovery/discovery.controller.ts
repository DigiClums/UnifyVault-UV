import { Controller, Get, Post, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { DiscoveryService, DiscoveryResult, CorrelatedDiscoveryItem } from './discovery.service';

@Controller('discovery')
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @Get('feed')
  async getCorrelatedDiscoveryFeed(
    @Query('limit') limit?: string,
  ): Promise<CorrelatedDiscoveryItem[]> {
    return this.discoveryService.getCorrelatedDiscoveryFeed({
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Post('github/run')
  @HttpCode(HttpStatus.OK)
  async runGitHubDiscovery(
    @Body() body: { query?: string; limit?: number },
  ): Promise<DiscoveryResult> {
    return this.discoveryService.runGitHubDiscovery(body);
  }
}

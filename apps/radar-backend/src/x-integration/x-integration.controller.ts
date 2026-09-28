import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Res,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { XOAuthService } from './x-oauth.service';
import { XSignalProvider, XCollectionOptions } from './x-signal.provider';

@Controller('integrations/x')
export class XIntegrationController {
  private readonly logger = new Logger(XIntegrationController.name);

  constructor(
    private readonly xOAuthService: XOAuthService,
    private readonly xSignalProvider: XSignalProvider,
  ) {}

  /**
   * GET /integrations/x/connect
   * Initiates OAuth 2.0 PKCE flow
   */
  @Get('connect')
  async connect(
    @Query('redirect') redirect?: string,
    @Query('userId') userId?: string,
    @Res() res?: Response,
  ) {
    const authData = await this.xOAuthService.generateAuthUrl(userId || 'system');

    if (redirect === 'true' && res) {
      return res.redirect(authData.url);
    }

    if (res) {
      return res.status(HttpStatus.OK).json(authData);
    }
    return authData;
  }

  /**
   * GET /integrations/x/callback
   * Handles callback from X OAuth 2.0
   */
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error?: string,
    @Query('error_description') errorDescription?: string,
    @Res() res?: Response,
  ) {
    const frontendBase = process.env.FRONTEND_URL || 'https://app.unifyvault.xyz';

    if (error) {
      this.logger.warn(`X OAuth authorization declined: ${error} - ${errorDescription}`);
      if (res) {
        return res.redirect(
          `${frontendBase}/radar/validation?x_status=error&message=${encodeURIComponent(
            errorDescription || error,
          )}`,
        );
      }
      return { success: false, error, errorDescription };
    }

    try {
      const result = await this.xOAuthService.handleCallback(code, state);
      if (res) {
        return res.redirect(
          `${frontendBase}/radar/validation?x_status=connected&x_username=${encodeURIComponent(
            result.xUsername,
          )}`,
        );
      }
      return result;
    } catch (err: any) {
      this.logger.error(`OAuth callback processing error: ${err.message}`);
      if (res) {
        return res.redirect(
          `${frontendBase}/radar/validation?x_status=error&message=${encodeURIComponent(err.message)}`,
        );
      }
      throw err;
    }
  }

  /**
   * GET /integrations/x/status
   * Safe status check (never returns raw tokens)
   */
  @Get('status')
  async getStatus(@Query('userId') userId?: string) {
    return this.xOAuthService.getStatus(userId || 'system');
  }

  /**
   * POST /integrations/x/disconnect
   * Disconnects integration
   */
  @Post('disconnect')
  @HttpCode(HttpStatus.OK)
  async disconnect(@Body() body: { userId?: string }) {
    return this.xOAuthService.disconnect(body?.userId || 'system');
  }

  /**
   * GET /integrations/x/families
   * Returns metadata and definitions for all 3 query families
   */
  @Get('families')
  async getQueryFamilies() {
    return {
      enabled: this.xSignalProvider.isCollectionEnabled(),
      families: this.xSignalProvider.getQueryFamilies(),
    };
  }

  /**
   * POST /integrations/x/manual-evidence
   * Ingests verified manual X evidence with zero-cost provenance
   */
  @Post('manual-evidence')
  @HttpCode(HttpStatus.OK)
  async ingestManualEvidence(
    @Body()
    body: {
      url: string;
      publishedAt?: string;
      evidenceText?: string;
      authorUsername?: string;
      authorName?: string;
      projectId?: string;
      technicalArtifactUrl?: string;
    },
  ) {
    return this.xSignalProvider.ingestManualEvidence(body);
  }

  /**
   * POST /integrations/x/collect
   * Triggers public signal collection scan using authorized connection
   */
  @Post('collect')
  @HttpCode(HttpStatus.OK)
  async collectSignals(@Body() options: XCollectionOptions) {
    return this.xSignalProvider.collectSignals(options);
  }
}

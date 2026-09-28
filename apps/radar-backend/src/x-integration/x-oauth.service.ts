import { Injectable, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../security/encryption.service';

export interface OAuthInitResult {
  url: string;
  state: string;
  expiresAt: Date;
}

export interface XStatusResult {
  connected: boolean;
  xUsername: string | null;
  xUserId: string | null;
  scopes: string[];
  tokenExpiresAt: Date | null;
  lastSuccessfulApiCallAt: Date | null;
  lastErrorAt: Date | null;
}

@Injectable()
export class XOAuthService {
  private readonly logger = new Logger(XOAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
  ) {}

  private getClientId(): string {
    return process.env.X_CLIENT_ID || 'UNIFYVAULT_X_CLIENT_ID';
  }

  private getClientSecret(): string | null {
    return process.env.X_CLIENT_SECRET || null;
  }

  private getRedirectUri(): string {
    return (
      process.env.X_REDIRECT_URI || 'https://app.unifyvault.xyz/api/radar/integrations/x/callback'
    );
  }

  private getScopes(): string {
    return process.env.X_SCOPES || 'users.read tweet.read offline.access';
  }

  /**
   * 1. Generate OAuth 2.0 PKCE authorization URL
   */
  async generateAuthUrl(userId = 'system', customRedirectUri?: string): Promise<OAuthInitResult> {
    const state = crypto.randomBytes(24).toString('hex');
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

    const redirectUri = customRedirectUri || this.getRedirectUri();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes TTL

    // Persist session to database (bound to state)
    await this.prisma.xOAuthSession.create({
      data: {
        state,
        codeVerifier,
        redirectUri,
        userId,
        expiresAt,
      },
    });

    const clientId = this.getClientId();
    const scopes = this.getScopes();

    const authUrl = new URL('https://twitter.com/i/oauth2/authorize');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    return {
      url: authUrl.toString(),
      state,
      expiresAt,
    };
  }

  /**
   * 2. Handle OAuth 2.0 callback, exchange code for tokens, fetch user identity & encrypt
   */
  async handleCallback(code: string, state: string) {
    if (!code || !state) {
      throw new BadRequestException('Missing authorization code or state parameter');
    }

    // Lookup session
    const session = await this.prisma.xOAuthSession.findUnique({
      where: { state },
    });

    if (!session) {
      throw new BadRequestException('Invalid or expired OAuth state parameter (CSRF protection)');
    }

    if (new Date() > session.expiresAt) {
      await this.prisma.xOAuthSession.delete({ where: { id: session.id } }).catch(() => null);
      throw new BadRequestException('OAuth session expired. Please re-initiate connection.');
    }

    // Consume session immediately (single-use token protection)
    await this.prisma.xOAuthSession.delete({ where: { id: session.id } }).catch(() => null);

    const clientId = this.getClientId();
    const clientSecret = this.getClientSecret();
    const redirectUri = session.redirectUri;

    const tokenParams = new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      client_id: clientId,
      redirect_uri: redirectUri,
      code_verifier: session.codeVerifier,
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    if (clientSecret) {
      const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      headers['Authorization'] = `Basic ${basicAuth}`;
    }

    let tokenData: any;
    try {
      const tokenRes = await axios.post(
        'https://api.twitter.com/2/oauth2/token',
        tokenParams.toString(),
        {
          headers,
          timeout: 10000,
        },
      );
      tokenData = tokenRes.data;
    } catch (err: any) {
      const errMsg =
        err.response?.data?.error_description || err.response?.data?.error || err.message;
      this.logger.error(`Token exchange failed: ${errMsg}`);
      throw new BadRequestException(`X Token exchange failed: ${errMsg}`);
    }

    const { access_token, refresh_token, expires_in, scope } = tokenData;
    const tokenExpiresAt = expires_in ? new Date(Date.now() + expires_in * 1000) : null;
    const scopesList = scope ? scope.split(' ') : this.getScopes().split(' ');

    // Fetch user identity
    let userData: any;
    try {
      const userRes = await axios.get('https://api.twitter.com/2/users/me', {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
        timeout: 10000,
      });
      userData = userRes.data?.data;
    } catch (err: any) {
      this.logger.error(`Failed to fetch X user profile: ${err.message}`);
      throw new BadRequestException('Failed to retrieve authorized X user identity');
    }

    if (!userData?.id || !userData?.username) {
      throw new BadRequestException('Invalid user identity received from X API');
    }

    // Encrypt tokens before storing
    const encryptedAccessToken = this.encryptionService.encrypt(access_token);
    const encryptedRefreshToken = refresh_token
      ? this.encryptionService.encrypt(refresh_token)
      : null;

    // Upsert integration
    const integration = await this.prisma.xIntegration.upsert({
      where: { xUserId: userData.id },
      create: {
        userId: session.userId || 'system',
        xUserId: userData.id,
        xUsername: userData.username,
        xName: userData.name || userData.username,
        encryptedAccessToken,
        encryptedRefreshToken,
        tokenExpiresAt,
        scopes: scopesList,
        status: 'CONNECTED',
        lastSuccessfulApiCallAt: new Date(),
      },
      update: {
        userId: session.userId || 'system',
        xUsername: userData.username,
        xName: userData.name || userData.username,
        encryptedAccessToken,
        encryptedRefreshToken,
        tokenExpiresAt,
        scopes: scopesList,
        status: 'CONNECTED',
        lastSuccessfulApiCallAt: new Date(),
        lastErrorAt: null,
        lastErrorMessage: null,
      },
    });

    this.logger.log(`X Account @${userData.username} successfully connected to Early Radar.`);

    return {
      success: true,
      xUsername: integration.xUsername,
      xUserId: integration.xUserId,
      status: integration.status,
    };
  }

  /**
   * 3. Get connection status without exposing sensitive credentials
   */
  async getStatus(userId = 'system'): Promise<XStatusResult> {
    const integration = await this.prisma.xIntegration.findFirst({
      where: {
        OR: [{ userId }, { userId: 'system' }],
        status: 'CONNECTED',
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (!integration) {
      return {
        connected: false,
        xUsername: null,
        xUserId: null,
        scopes: [],
        tokenExpiresAt: null,
        lastSuccessfulApiCallAt: null,
        lastErrorAt: null,
      };
    }

    return {
      connected: integration.status === 'CONNECTED',
      xUsername: integration.xUsername,
      xUserId: integration.xUserId,
      scopes: integration.scopes,
      tokenExpiresAt: integration.tokenExpiresAt,
      lastSuccessfulApiCallAt: integration.lastSuccessfulApiCallAt,
      lastErrorAt: integration.lastErrorAt,
    };
  }

  /**
   * 4. Disconnect X integration securely
   */
  async disconnect(userId = 'system') {
    const integrations = await this.prisma.xIntegration.findMany({
      where: {
        OR: [{ userId }, { userId: 'system' }],
      },
    });

    for (const integ of integrations) {
      await this.prisma.xIntegration.update({
        where: { id: integ.id },
        data: {
          status: 'DISCONNECTED',
          encryptedAccessToken: '',
          encryptedRefreshToken: null,
          lastErrorAt: null,
          lastErrorMessage: 'Disconnected by user',
        },
      });
    }

    return { success: true, message: 'X integration disconnected.' };
  }

  /**
   * 5. Retrieve a valid, decrypted access token (auto-refreshes if near expiry)
   */
  async getValidAccessToken(
    userId = 'system',
  ): Promise<{ token: string; username: string; xUserId: string } | null> {
    const integration = await this.prisma.xIntegration.findFirst({
      where: {
        OR: [{ userId }, { userId: 'system' }],
        status: 'CONNECTED',
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (!integration || !integration.encryptedAccessToken) {
      return null;
    }

    const now = Date.now();
    const expiry = integration.tokenExpiresAt ? new Date(integration.tokenExpiresAt).getTime() : 0;
    const isNearExpiry = expiry > 0 && expiry - now < 5 * 60 * 1000; // 5 min buffer

    // If near expiry and refresh token available, refresh
    if (isNearExpiry && integration.encryptedRefreshToken) {
      try {
        const rawRefreshToken = this.encryptionService.decrypt(integration.encryptedRefreshToken);
        const clientId = this.getClientId();
        const clientSecret = this.getClientSecret();

        const params = new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: rawRefreshToken,
          client_id: clientId,
        });

        const headers: Record<string, string> = {
          'Content-Type': 'application/x-www-form-urlencoded',
        };

        if (clientSecret) {
          const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
          headers['Authorization'] = `Basic ${basicAuth}`;
        }

        const res = await axios.post('https://api.twitter.com/2/oauth2/token', params.toString(), {
          headers,
          timeout: 10000,
        });

        const { access_token, refresh_token, expires_in } = res.data;
        const newEncryptedAccess = this.encryptionService.encrypt(access_token);
        const newEncryptedRefresh = refresh_token
          ? this.encryptionService.encrypt(refresh_token)
          : integration.encryptedRefreshToken;
        const newTokenExpiry = expires_in ? new Date(Date.now() + expires_in * 1000) : null;

        await this.prisma.xIntegration.update({
          where: { id: integration.id },
          data: {
            encryptedAccessToken: newEncryptedAccess,
            encryptedRefreshToken: newEncryptedRefresh,
            tokenExpiresAt: newTokenExpiry,
            lastSuccessfulApiCallAt: new Date(),
          },
        });

        return {
          token: access_token,
          username: integration.xUsername,
          xUserId: integration.xUserId,
        };
      } catch (err: any) {
        this.logger.error(`Token refresh failed: ${err.message}`);
        await this.prisma.xIntegration.update({
          where: { id: integration.id },
          data: {
            lastErrorAt: new Date(),
            lastErrorMessage: `Token refresh failed: ${err.message}`,
          },
        });
      }
    }

    const decrypted = this.encryptionService.decrypt(integration.encryptedAccessToken);
    return { token: decrypted, username: integration.xUsername, xUserId: integration.xUserId };
  }
}

import { XOAuthService } from './x-oauth.service';
import { BadRequestException } from '@nestjs/common';

describe('XOAuthService', () => {
  let service: XOAuthService;
  let mockPrisma: any;
  let mockEncryption: any;

  beforeEach(() => {
    mockPrisma = {
      xOAuthSession: {
        create: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn(),
        delete: jest.fn().mockResolvedValue({}),
      },
      xIntegration: {
        upsert: jest.fn().mockResolvedValue({}),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
      },
    };

    mockEncryption = {
      encrypt: jest.fn((val: string) => `enc_${val}`),
      decrypt: jest.fn((val: string) => val.replace('enc_', '')),
    };

    service = new XOAuthService(mockPrisma, mockEncryption);
  });

  describe('OAuth 2.0 PKCE Auth URL Generation', () => {
    it('should generate PKCE code challenge and store session state', async () => {
      mockPrisma.xOAuthSession.create.mockResolvedValue({});

      const result = await service.generateAuthUrl('user-1');

      expect(result.url).toContain('https://twitter.com/i/oauth2/authorize');
      expect(result.url).toContain('response_type=code');
      expect(result.url).toContain('code_challenge_method=S256');
      expect(result.url).toContain(`state=${result.state}`);
      expect(mockPrisma.xOAuthSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            state: result.state,
            userId: 'user-1',
          }),
        }),
      );
    });
  });

  describe('Callback & State Validation (Anti-CSRF)', () => {
    it('should reject callback when state is invalid or missing in database', async () => {
      mockPrisma.xOAuthSession.findUnique.mockResolvedValue(null);

      await expect(service.handleCallback('valid_code', 'invalid_state')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject callback when OAuth session has expired', async () => {
      mockPrisma.xOAuthSession.findUnique.mockResolvedValue({
        id: 'sess-1',
        state: 'expired_state',
        expiresAt: new Date(Date.now() - 10000), // Expired
      });

      await expect(service.handleCallback('valid_code', 'expired_state')).rejects.toThrow(
        'OAuth session expired. Please re-initiate connection.',
      );
    });
  });

  describe('Connection Status and Disconnect Flow', () => {
    it('should return safe status without leaking encrypted or raw tokens', async () => {
      mockPrisma.xIntegration.findFirst.mockResolvedValue({
        id: 'int-1',
        xUsername: 'Web3Researcher',
        xUserId: '12345678',
        scopes: ['users.read', 'tweet.read'],
        tokenExpiresAt: new Date('2026-10-01'),
        status: 'CONNECTED',
        lastSuccessfulApiCallAt: new Date('2026-09-18'),
        lastErrorAt: null,
      });

      const status = await service.getStatus('user-1');
      expect(status.connected).toBe(true);
      expect(status.xUsername).toBe('Web3Researcher');
      expect((status as any).encryptedAccessToken).toBeUndefined();
      expect((status as any).accessToken).toBeUndefined();
    });

    it('should cleanly disconnect and blank tokens', async () => {
      mockPrisma.xIntegration.findMany.mockResolvedValue([{ id: 'int-1' }]);
      mockPrisma.xIntegration.update.mockResolvedValue({});

      const res = await service.disconnect('user-1');
      expect(res.success).toBe(true);
      expect(mockPrisma.xIntegration.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'int-1' },
          data: expect.objectContaining({
            status: 'DISCONNECTED',
            encryptedAccessToken: '',
          }),
        }),
      );
    });
  });
});

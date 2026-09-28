import { Module } from '@nestjs/common';
import { EncryptionService } from '../security/encryption.service';
import { XOAuthService } from './x-oauth.service';
import { XSignalProvider } from './x-signal.provider';
import { XIntegrationController } from './x-integration.controller';
import { InvestigationModule } from '../investigation/investigation.module';

@Module({
  imports: [InvestigationModule],
  providers: [EncryptionService, XOAuthService, XSignalProvider],
  controllers: [XIntegrationController],
  exports: [XOAuthService, XSignalProvider, EncryptionService],
})
export class XIntegrationModule {}

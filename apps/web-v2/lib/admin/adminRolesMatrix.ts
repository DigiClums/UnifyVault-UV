import type { ContractRoleMigrationItem } from './types';
import type { DeployedContractsMap } from '../deployment/types';

export function getContractRolesMatrix(
  contracts: DeployedContractsMap,
  currentAdmin: `0x${string}`,
  newAdmin?: `0x${string}`,
): ContractRoleMigrationItem[] {
  const items: ContractRoleMigrationItem[] = [];

  // 1. ProtocolDirectory
  if (contracts.ProtocolDirectory) {
    items.push({
      contractName: 'ProtocolDirectory',
      contractAddress: contracts.ProtocolDirectory,
      roleIdentifier: '0x0000000000000000000000000000000000000000000000000000000000000000',
      roleName: 'DEFAULT_ADMIN_ROLE',
      accessModel: 'ACCESS_CONTROL',
      currentAuthority: currentAdmin,
      newAuthority: newAdmin,
      isCurrentAuthorityVerified: false,
      isNewAuthorityVerified: false,
      status: 'pending',
      notes: 'Controls address registry and role granting for ProtocolDirectory.',
    });
    items.push({
      contractName: 'ProtocolDirectory',
      contractAddress: contracts.ProtocolDirectory,
      roleIdentifier: '0x71840dc4906352362b0cdaf79870196c8e42acafade72d5d5a6d59291253ceb1', // keccak256("GOVERNANCE_ROLE")
      roleName: 'GOVERNANCE_ROLE',
      accessModel: 'ACCESS_CONTROL',
      currentAuthority: currentAdmin,
      newAuthority: newAdmin,
      isCurrentAuthorityVerified: false,
      isNewAuthorityVerified: false,
      status: 'pending',
      notes: 'Authorizes registerAddress and freeze operations.',
    });
  }

  // 2. OracleManager
  if (contracts.OracleManager) {
    items.push({
      contractName: 'OracleManager',
      contractAddress: contracts.OracleManager,
      roleIdentifier: '0x0000000000000000000000000000000000000000000000000000000000000000',
      roleName: 'DEFAULT_ADMIN_ROLE',
      accessModel: 'ACCESS_CONTROL',
      currentAuthority: currentAdmin,
      newAuthority: newAdmin,
      isCurrentAuthorityVerified: false,
      isNewAuthorityVerified: false,
      status: 'pending',
      notes: 'Governs oracle primary and fallback feed registration.',
    });
  }

  // 3. CustodyVault
  if (contracts.CustodyVault) {
    items.push({
      contractName: 'CustodyVault',
      contractAddress: contracts.CustodyVault,
      roleIdentifier: '0x0000000000000000000000000000000000000000000000000000000000000000',
      roleName: 'DEFAULT_ADMIN_ROLE',
      accessModel: 'ACCESS_CONTROL',
      currentAuthority: currentAdmin,
      newAuthority: newAdmin,
      isCurrentAuthorityVerified: false,
      isNewAuthorityVerified: false,
      status: 'pending',
      notes: 'Controls asset configurations and emergency guardian operations.',
    });
  }

  // 4. Treasury
  if (contracts.Treasury) {
    items.push({
      contractName: 'Treasury',
      contractAddress: contracts.Treasury,
      roleIdentifier: '0x0000000000000000000000000000000000000000000000000000000000000000',
      roleName: 'DEFAULT_ADMIN_ROLE',
      accessModel: 'ACCESS_CONTROL',
      currentAuthority: currentAdmin,
      newAuthority: newAdmin,
      isCurrentAuthorityVerified: false,
      isNewAuthorityVerified: false,
      status: 'pending',
      notes: 'Safeguards protocol-owned capital and fee revenue withdrawals.',
    });
  }

  // 5. FeeManager
  if (contracts.FeeManager) {
    items.push({
      contractName: 'FeeManager',
      contractAddress: contracts.FeeManager,
      roleIdentifier: '0x0000000000000000000000000000000000000000000000000000000000000000',
      roleName: 'DEFAULT_ADMIN_ROLE',
      accessModel: 'ACCESS_CONTROL',
      currentAuthority: currentAdmin,
      newAuthority: newAdmin,
      isCurrentAuthorityVerified: false,
      isNewAuthorityVerified: false,
      status: 'pending',
      notes: 'Configures deposit and redemption basis point parameters.',
    });
  }

  // 6. UVBEV2
  if (contracts.UVBEV2) {
    items.push({
      contractName: 'UVBEV2',
      contractAddress: contracts.UVBEV2,
      roleIdentifier: '0x0000000000000000000000000000000000000000000000000000000000000000',
      roleName: 'DEFAULT_ADMIN_ROLE',
      accessModel: 'ACCESS_CONTROL',
      currentAuthority: currentAdmin,
      newAuthority: newAdmin,
      isCurrentAuthorityVerified: false,
      isNewAuthorityVerified: false,
      status: 'pending',
      notes: 'Administers share token mint/burn authorities and pause controls.',
    });
  }

  // 7. UnifyVaultController (Proxy)
  if (contracts.UnifyVaultController) {
    items.push({
      contractName: 'UnifyVaultController',
      contractAddress: contracts.UnifyVaultController,
      roleIdentifier: '0x0000000000000000000000000000000000000000000000000000000000000000',
      roleName: 'DEFAULT_ADMIN_ROLE',
      accessModel: 'ACCESS_CONTROL',
      currentAuthority: currentAdmin,
      newAuthority: newAdmin,
      isCurrentAuthorityVerified: false,
      isNewAuthorityVerified: false,
      status: 'pending',
      notes: 'Controls execution engine, rate limits, and UUPS upgrades.',
    });
  }

  // 8. LiquidityManager
  if (contracts.LiquidityManager) {
    items.push({
      contractName: 'LiquidityManager',
      contractAddress: contracts.LiquidityManager,
      roleIdentifier: '0x0000000000000000000000000000000000000000000000000000000000000000',
      roleName: 'DEFAULT_ADMIN_ROLE',
      accessModel: 'ACCESS_CONTROL',
      currentAuthority: currentAdmin,
      newAuthority: newAdmin,
      isCurrentAuthorityVerified: false,
      isNewAuthorityVerified: false,
      status: 'pending',
      notes: 'Controls rebalance liquidity routing parameters.',
    });
  }

  // 9. SwapAdapter
  if (contracts.SwapAdapter) {
    items.push({
      contractName: 'SwapAdapter',
      contractAddress: contracts.SwapAdapter,
      roleIdentifier: '0x0000000000000000000000000000000000000000000000000000000000000000',
      roleName: 'DEFAULT_ADMIN_ROLE',
      accessModel: 'ACCESS_CONTROL',
      currentAuthority: currentAdmin,
      newAuthority: newAdmin,
      isCurrentAuthorityVerified: false,
      isNewAuthorityVerified: false,
      status: 'pending',
      notes: 'Governs approved Uniswap V3 routers.',
    });
  }

  // 10. StrategyManager
  if (contracts.StrategyManager) {
    items.push({
      contractName: 'StrategyManager',
      contractAddress: contracts.StrategyManager,
      roleIdentifier: '0x0000000000000000000000000000000000000000000000000000000000000000',
      roleName: 'DEFAULT_ADMIN_ROLE',
      accessModel: 'ACCESS_CONTROL',
      currentAuthority: currentAdmin,
      newAuthority: newAdmin,
      isCurrentAuthorityVerified: false,
      isNewAuthorityVerified: false,
      status: 'pending',
      notes: 'Governs portfolio asset allocation weights.',
    });
  }

  // 11. PortfolioManager
  if (contracts.PortfolioManager) {
    items.push({
      contractName: 'PortfolioManager',
      contractAddress: contracts.PortfolioManager,
      roleIdentifier: '0x0000000000000000000000000000000000000000000000000000000000000000',
      roleName: 'DEFAULT_ADMIN_ROLE',
      accessModel: 'ACCESS_CONTROL',
      currentAuthority: currentAdmin,
      newAuthority: newAdmin,
      isCurrentAuthorityVerified: false,
      isNewAuthorityVerified: false,
      status: 'pending',
      notes: 'Coordinates module addresses and NAV calculation.',
    });
  }

  // 12. CostBasisManagerV2
  if (contracts.CostBasisManagerV2) {
    items.push({
      contractName: 'CostBasisManagerV2',
      contractAddress: contracts.CostBasisManagerV2,
      roleIdentifier: '0x0000000000000000000000000000000000000000000000000000000000000000',
      roleName: 'DEFAULT_ADMIN_ROLE',
      accessModel: 'ACCESS_CONTROL',
      currentAuthority: currentAdmin,
      newAuthority: newAdmin,
      isCurrentAuthorityVerified: false,
      isNewAuthorityVerified: false,
      status: 'pending',
      notes: 'Administers cost-basis accounting recorders.',
    });
  }

  // 13. P2PEscrowV2
  if (contracts.P2PEscrowV2) {
    items.push({
      contractName: 'P2PEscrowV2',
      contractAddress: contracts.P2PEscrowV2,
      roleIdentifier: '0x0000000000000000000000000000000000000000000000000000000000000000',
      roleName: 'DEFAULT_ADMIN_ROLE',
      accessModel: 'ACCESS_CONTROL',
      currentAuthority: currentAdmin,
      newAuthority: newAdmin,
      isCurrentAuthorityVerified: false,
      isNewAuthorityVerified: false,
      status: 'pending',
      notes: 'Controls escrow deposit safeguards and arbitrator roles.',
    });
  }

  // 14. PerformanceManager
  if (contracts.PerformanceManager) {
    items.push({
      contractName: 'PerformanceManager',
      contractAddress: contracts.PerformanceManager,
      roleIdentifier: '0x0000000000000000000000000000000000000000000000000000000000000000',
      roleName: 'DEFAULT_ADMIN_ROLE',
      accessModel: 'ACCESS_CONTROL',
      currentAuthority: currentAdmin,
      newAuthority: newAdmin,
      isCurrentAuthorityVerified: false,
      isNewAuthorityVerified: false,
      status: 'pending',
      notes: 'Governs high-watermark fee calculations.',
    });
  }

  // 15. ChainlinkOracleProvider
  if (contracts.ChainlinkOracleProvider) {
    items.push({
      contractName: 'ChainlinkOracleProvider',
      contractAddress: contracts.ChainlinkOracleProvider,
      roleIdentifier: '0x0000000000000000000000000000000000000000000000000000000000000000',
      roleName: 'DEFAULT_ADMIN_ROLE',
      accessModel: 'ACCESS_CONTROL',
      currentAuthority: currentAdmin,
      newAuthority: newAdmin,
      isCurrentAuthorityVerified: false,
      isNewAuthorityVerified: false,
      status: 'pending',
      notes: 'Governs Chainlink oracle feeds registration.',
    });
  }

  // 16. Marketplace
  if (contracts.Marketplace) {
    items.push({
      contractName: 'Marketplace',
      contractAddress: contracts.Marketplace,
      roleIdentifier: '0x0000000000000000000000000000000000000000000000000000000000000000',
      roleName: 'DEFAULT_ADMIN_ROLE',
      accessModel: 'ACCESS_CONTROL',
      currentAuthority: currentAdmin,
      newAuthority: newAdmin,
      isCurrentAuthorityVerified: false,
      isNewAuthorityVerified: false,
      status: 'pending',
      notes: 'Oversees P2P limit orderbook and arbitration parameters.',
    });
  }

  // 17. UVBEStakingVault
  if (contracts.UVBEStakingVault) {
    items.push({
      contractName: 'UVBEStakingVault',
      contractAddress: contracts.UVBEStakingVault,
      roleIdentifier: '0x0000000000000000000000000000000000000000000000000000000000000000',
      roleName: 'DEFAULT_ADMIN_ROLE',
      accessModel: 'ACCESS_CONTROL',
      currentAuthority: currentAdmin,
      newAuthority: newAdmin,
      isCurrentAuthorityVerified: false,
      isNewAuthorityVerified: false,
      status: 'pending',
      notes: 'Administers staking vault guardian pause and access roles.',
    });
    items.push({
      contractName: 'UVBEStakingVault',
      contractAddress: contracts.UVBEStakingVault,
      roleIdentifier: '0x71840dc4906352362b0cdaf79870196c8e42acafade72d5d5a6d59291253ceb1',
      roleName: 'GOVERNANCE_ROLE',
      accessModel: 'ACCESS_CONTROL',
      currentAuthority: currentAdmin,
      newAuthority: newAdmin,
      isCurrentAuthorityVerified: false,
      isNewAuthorityVerified: false,
      status: 'pending',
      notes: 'Governance role for module configuration.',
    });
  }

  // 18. UVBEReferralRegistry
  if (contracts.UVBEReferralRegistry) {
    items.push({
      contractName: 'UVBEReferralRegistry',
      contractAddress: contracts.UVBEReferralRegistry,
      roleIdentifier: '0x0000000000000000000000000000000000000000000000000000000000000000',
      roleName: 'DEFAULT_ADMIN_ROLE',
      accessModel: 'ACCESS_CONTROL',
      currentAuthority: currentAdmin,
      newAuthority: newAdmin,
      isCurrentAuthorityVerified: false,
      isNewAuthorityVerified: false,
      status: 'pending',
      notes: 'Administers 10-tier referral tree and DAO leader settings.',
    });
  }

  // 19. UVBERewardDistributor
  if (contracts.UVBERewardDistributor) {
    items.push({
      contractName: 'UVBERewardDistributor',
      contractAddress: contracts.UVBERewardDistributor,
      roleIdentifier: '0x0000000000000000000000000000000000000000000000000000000000000000',
      roleName: 'DEFAULT_ADMIN_ROLE',
      accessModel: 'ACCESS_CONTROL',
      currentAuthority: currentAdmin,
      newAuthority: newAdmin,
      isCurrentAuthorityVerified: false,
      isNewAuthorityVerified: false,
      status: 'pending',
      notes: 'Controls dynamic APY and DAO leadership distribution settings.',
    });
  }

  // 20. UnifyVaultPaymaster
  if (contracts.UnifyVaultPaymaster) {
    items.push({
      contractName: 'UnifyVaultPaymaster',
      contractAddress: contracts.UnifyVaultPaymaster,
      roleIdentifier: '0x0000000000000000000000000000000000000000000000000000000000000000',
      roleName: 'Ownable (2-Step)',
      accessModel: 'OWNABLE',
      currentAuthority: currentAdmin,
      newAuthority: newAdmin,
      isCurrentAuthorityVerified: false,
      isNewAuthorityVerified: false,
      status: 'pending',
      notes: 'ERC-4337 gas sponsorship whitelist and oracle pricing owner.',
    });
  }

  // 21. GasTreasury
  if (contracts.GasTreasury) {
    items.push({
      contractName: 'GasTreasury',
      contractAddress: contracts.GasTreasury,
      roleIdentifier: '0x0000000000000000000000000000000000000000000000000000000000000000',
      roleName: 'Ownable (2-Step)',
      accessModel: 'OWNABLE',
      currentAuthority: currentAdmin,
      newAuthority: newAdmin,
      isCurrentAuthorityVerified: false,
      isNewAuthorityVerified: false,
      status: 'pending',
      notes: 'Governs automated gas refill rate limits and reserve funds.',
    });
  }

  // 22. UnifyVaultTimelock
  if (contracts.UnifyVaultTimelock) {
    items.push({
      contractName: 'UnifyVaultTimelock',
      contractAddress: contracts.UnifyVaultTimelock,
      roleIdentifier: '0x0000000000000000000000000000000000000000000000000000000000000000',
      roleName: 'DEFAULT_ADMIN_ROLE',
      accessModel: 'ACCESS_CONTROL',
      currentAuthority: currentAdmin,
      newAuthority: newAdmin,
      isCurrentAuthorityVerified: false,
      isNewAuthorityVerified: false,
      status: 'pending',
      notes: '48-hour timelock administration and proposer authority.',
    });
  }

  return items;
}

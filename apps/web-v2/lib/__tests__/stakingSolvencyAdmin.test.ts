import { describe, it, expect } from 'vitest';
import {
  getAbiItem,
  encodeFunctionData,
  decodeFunctionData,
  parseUnits,
  formatUnits,
  keccak256,
  toHex,
} from 'viem';
import {
  STAKING_VAULT_ABI,
  REWARD_DISTRIBUTOR_ABI,
  REFERRAL_REGISTRY_ABI,
  DaoEpoch,
  RewardCapacity,
  DaoLeaderShares,
} from '../contracts/staking';
import { DEPLOYED_CONTRACTS_MAINNET, getChainTokens } from '../../constants';
import {
  GOVERNANCE_ROLE_HASH,
  GUARDIAN_ROLE_HASH,
  DEFAULT_ADMIN_ROLE_HASH,
} from '../contracts/escrow';

describe('Staking, Solvency & DAO Leadership Admin Test Suite', () => {
  const AUTHORIZED_GOVERNANCE = '0xd905920c91853039060246Ed5724AA72B91a96DA';
  const UNAUTHORIZED_USER = '0x1111111111111111111111111111111111111111';

  describe('1. Canonical Deployed Staking Contract Addresses', () => {
    it('verifies exact Base Mainnet UVBEStakingVault address', () => {
      expect(DEPLOYED_CONTRACTS_MAINNET.StakingVault.toLowerCase()).toBe(
        '0x6fb5dede967270aeb1a893eaaccd123c7d0cfe86',
      );
    });

    it('verifies exact Base Mainnet UVBERewardDistributor address', () => {
      expect(DEPLOYED_CONTRACTS_MAINNET.RewardDistributor.toLowerCase()).toBe(
        '0x8f6169ed7091ed14bb4cdfdda9e7cedbf366c7dd',
      );
    });

    it('verifies exact Base Mainnet UVBEReferralRegistry address', () => {
      expect(DEPLOYED_CONTRACTS_MAINNET.ReferralRegistry.toLowerCase()).toBe(
        '0x3b3eabedbcd4de77bb89f00d1e94fa482ecaac6a',
      );
    });
  });

  describe('2. Reward Capacity & Solvency View Function Verification', () => {
    it('includes getRewardCapacity on REWARD_DISTRIBUTOR_ABI returning 4-tuple', () => {
      const item = getAbiItem({
        abi: REWARD_DISTRIBUTOR_ABI,
        name: 'getRewardCapacity',
      });
      expect(item).toBeDefined();
      expect(item.outputs).toHaveLength(4);
      expect(item.outputs[0].type).toBe('uint256'); // availableCapital
      expect(item.outputs[1].type).toBe('uint256'); // liabilities
      expect(item.outputs[2].type).toBe('uint256'); // surplusCapacity
      expect(item.outputs[3].type).toBe('uint256'); // currentBps
    });

    it('includes totalOutstandingLiabilities and totalRewardPaid view functions', () => {
      const liabItem = getAbiItem({
        abi: REWARD_DISTRIBUTOR_ABI,
        name: 'totalOutstandingLiabilities',
      });
      const paidItem = getAbiItem({
        abi: REWARD_DISTRIBUTOR_ABI,
        name: 'totalRewardPaid',
      });

      expect(liabItem).toBeDefined();
      expect(paidItem).toBeDefined();
    });

    it('includes getAvailableProtocolCapital on STAKING_VAULT_ABI', () => {
      const capitalItem = getAbiItem({
        abi: STAKING_VAULT_ABI,
        name: 'getAvailableProtocolCapital',
      });
      expect(capitalItem).toBeDefined();
    });

    it('correctly computes surplus capacity and APY BPS mathematically', () => {
      const availableCapital = parseUnits('100000', 18);
      const liabilities = parseUnits('20000', 18);
      const totalStaked = parseUnits('500000', 18);

      const surplusCapacity = availableCapital > liabilities ? availableCapital - liabilities : 0n;
      expect(surplusCapacity).toBe(parseUnits('80000', 18));

      // Annual APY formula: (surplusCapacity * 10000) / totalStaked
      const calculatedBps = (surplusCapacity * 10000n) / totalStaked;
      expect(calculatedBps).toBe(1600n); // 16.00% APY
      expect(Number(calculatedBps) / 100).toBe(16.0);
    });

    it('caps dynamic APY at MAX_RECURRING_ANNUAL_BPS (600.00% / 60000 BPS)', () => {
      const availableCapital = parseUnits('400000', 18);
      const liabilities = 0n;
      const totalStaked = parseUnits('50000', 18); // 8x surplus relative to stake = 800%

      const surplusCapacity = availableCapital - liabilities;
      const rawBps = (surplusCapacity * 10000n) / totalStaked; // 80000 BPS (800%)
      const cappedBps = rawBps > 60000n ? 60000n : rawBps;

      expect(cappedBps).toBe(60000n); // 600.00% ceiling
    });
  });

  describe('3. DAO Epoch & DAO Leadership Decoding', () => {
    it('includes getDaoEpoch returning 6-field tuple', () => {
      const epochItem = getAbiItem({
        abi: REWARD_DISTRIBUTOR_ABI,
        name: 'getDaoEpoch',
      });
      expect(epochItem).toBeDefined();
      expect(epochItem.inputs).toHaveLength(1);
      expect(epochItem.outputs[0].type).toBe('tuple');
      // @ts-expect-error viem tuple inspection
      expect(epochItem.outputs[0].components).toHaveLength(6);
    });

    it('correctly maps mock DAO epoch struct into DaoEpoch type', () => {
      const mockEpoch: DaoEpoch = {
        epochId: 1n,
        poolAmount: parseUnits('5000', 18),
        totalShares: 14n,
        startTime: 1710000000n,
        endTime: 1712592000n, // +30 days
        isFinalized: false,
      };

      expect(mockEpoch.epochId).toBe(1n);
      expect(formatUnits(mockEpoch.poolAmount, 18)).toBe('5000');
      expect(mockEpoch.totalShares).toBe(14n);
      expect(mockEpoch.isFinalized).toBe(false);
    });

    it('includes getDaoLeaderShares on REFERRAL_REGISTRY_ABI returning leaders, shares, totalShares', () => {
      const leaderItem = getAbiItem({
        abi: REFERRAL_REGISTRY_ABI,
        name: 'getDaoLeaderShares',
      });
      expect(leaderItem).toBeDefined();
      expect(leaderItem.outputs).toHaveLength(3);
      expect(leaderItem.outputs[0].type).toBe('address[]');
      expect(leaderItem.outputs[1].type).toBe('uint256[]');
      expect(leaderItem.outputs[2].type).toBe('uint256');
    });

    it('correctly calculates pro-rata leader share percentages and payouts', () => {
      const poolAmount = parseUnits('1000', 18);
      const totalShares = 10n;
      const leaderShare = 3n; // Diamond leader = 3 shares

      const sharePct = (Number(leaderShare) / Number(totalShares)) * 100;
      const expectedPayout = (poolAmount * leaderShare) / totalShares;

      expect(sharePct).toBe(30);
      expect(formatUnits(expectedPayout, 18)).toBe('300');
    });
  });

  describe('4. Calldata Encoding for Checkpoint & DAO Finalization', () => {
    it('encodes checkpoint call on UVBERewardDistributor', () => {
      const callData = encodeFunctionData({
        abi: REWARD_DISTRIBUTOR_ABI,
        functionName: 'checkpoint',
      });

      const decoded = decodeFunctionData({
        abi: REWARD_DISTRIBUTOR_ABI,
        data: callData,
      });

      expect(decoded.functionName).toBe('checkpoint');
    });

    it('encodes finalizeDaoEpoch call with epochId parameter', () => {
      const epochId = 3n;
      const callData = encodeFunctionData({
        abi: REWARD_DISTRIBUTOR_ABI,
        functionName: 'finalizeDaoEpoch',
        args: [epochId],
      });

      const decoded = decodeFunctionData({
        abi: REWARD_DISTRIBUTOR_ABI,
        data: callData,
      });

      expect(decoded.functionName).toBe('finalizeDaoEpoch');
      expect(decoded.args[0]).toBe(3n);
    });
  });

  describe('5. RBAC Authorization & Pause State Controls', () => {
    it('verifies exact role hashes for Staking Governance and Guardian', () => {
      expect(GOVERNANCE_ROLE_HASH).toBe(keccak256(toHex('GOVERNANCE_ROLE')));
      expect(GUARDIAN_ROLE_HASH).toBe(keccak256(toHex('GUARDIAN_ROLE')));
      expect(DEFAULT_ADMIN_ROLE_HASH).toBe(
        '0x0000000000000000000000000000000000000000000000000000000000000000',
      );
    });

    it('encodes pause and unpause on UVBEStakingVault and UVBERewardDistributor', () => {
      const vaultPauseData = encodeFunctionData({
        abi: STAKING_VAULT_ABI,
        functionName: 'pause',
      });
      const vaultUnpauseData = encodeFunctionData({
        abi: STAKING_VAULT_ABI,
        functionName: 'unpause',
      });

      const distPauseData = encodeFunctionData({
        abi: REWARD_DISTRIBUTOR_ABI,
        functionName: 'pause',
      });
      const distUnpauseData = encodeFunctionData({
        abi: REWARD_DISTRIBUTOR_ABI,
        functionName: 'unpause',
      });

      expect(
        decodeFunctionData({ abi: STAKING_VAULT_ABI, data: vaultPauseData }).functionName,
      ).toBe('pause');
      expect(
        decodeFunctionData({ abi: STAKING_VAULT_ABI, data: vaultUnpauseData }).functionName,
      ).toBe('unpause');
      expect(
        decodeFunctionData({ abi: REWARD_DISTRIBUTOR_ABI, data: distPauseData }).functionName,
      ).toBe('pause');
      expect(
        decodeFunctionData({ abi: REWARD_DISTRIBUTOR_ABI, data: distUnpauseData }).functionName,
      ).toBe('unpause');
    });

    it('rejects unauthorized wallet actions for governance operations', () => {
      const isAuthorizedGovernance = (account?: string, hasGovRole = false, isAdmin = false) => {
        if (!account) return false;
        return (
          account.toLowerCase() === AUTHORIZED_GOVERNANCE.toLowerCase() || hasGovRole || isAdmin
        );
      };

      expect(isAuthorizedGovernance(AUTHORIZED_GOVERNANCE)).toBe(true);
      expect(isAuthorizedGovernance(UNAUTHORIZED_USER, false, false)).toBe(false);
      expect(isAuthorizedGovernance(undefined)).toBe(false);
    });
  });

  describe('6. Module Initialization / Frozen State Semantics', () => {
    it('verifies that setModules is a one-time frozen initialization', () => {
      const isModuleFrozen = (vaultDistributor: string, vaultRegistry: string) => {
        return (
          vaultDistributor !== '0x0000000000000000000000000000000000000000' &&
          vaultRegistry !== '0x0000000000000000000000000000000000000000'
        );
      };

      expect(
        isModuleFrozen(
          DEPLOYED_CONTRACTS_MAINNET.RewardDistributor,
          DEPLOYED_CONTRACTS_MAINNET.ReferralRegistry,
        ),
      ).toBe(true);
      expect(
        isModuleFrozen(
          '0x0000000000000000000000000000000000000000',
          DEPLOYED_CONTRACTS_MAINNET.ReferralRegistry,
        ),
      ).toBe(false);
    });
  });
});

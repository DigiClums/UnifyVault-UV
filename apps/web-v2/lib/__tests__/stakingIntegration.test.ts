import { describe, it, expect } from 'vitest';
import {
  STAKING_VAULT_ABI,
  REFERRAL_REGISTRY_ABI,
  REWARD_DISTRIBUTOR_ABI,
  REWARD_RESERVE_ABI,
} from '../contracts/staking';
import { DEPLOYED_CONTRACTS_SEPOLIA } from '../../constants';
import { formatUnits, parseUnits } from 'viem';
import { MIN_STAKE_AMOUNT, MAX_STAKE_AMOUNT, RANK_REQUIREMENTS } from '../../hooks/useStaking';

describe('Staking Contracts & Frontend Integration', () => {
  it('has valid deployed Base Sepolia staking addresses', () => {
    expect(DEPLOYED_CONTRACTS_SEPOLIA.StakingVault).toBe(
      '0xaa5deaF54BCfb5ddf4C7196eDEd2A4B981a327e4',
    );
    expect(DEPLOYED_CONTRACTS_SEPOLIA.ReferralRegistry).toBe(
      '0xc1F00539B6869b2445d85056EDc036114b939Ddd',
    );
    expect(DEPLOYED_CONTRACTS_SEPOLIA.RewardDistributor).toBe(
      '0x49D3Fef686b838a26b9B14E9728Ab99b66e320E9',
    );
    expect(DEPLOYED_CONTRACTS_SEPOLIA.RewardReserve).toBe(
      '0xf1E40C0e7aA253CE259A224f1CFEDEDEd6D77Fda',
    );
    expect(DEPLOYED_CONTRACTS_SEPOLIA.GenesisReferrer).toBe(
      '0x516FaAad5bce5a9269AC4a1A2FD986DdaBa1AbA1',
    );
  });

  it('contains expected ABIs with all functions', () => {
    expect(STAKING_VAULT_ABI.length).toBeGreaterThan(5);
    expect(REFERRAL_REGISTRY_ABI.length).toBeGreaterThan(5);
    expect(REWARD_DISTRIBUTOR_ABI.length).toBeGreaterThan(5);
    expect(REWARD_RESERVE_ABI.length).toBeGreaterThan(3);
  });

  it('enforces min 50 UVBE stake and max 100,000 UVBE', () => {
    expect(MIN_STAKE_AMOUNT).toBe(parseUnits('50', 18));
    expect(MAX_STAKE_AMOUNT).toBe(parseUnits('100000', 18));
  });

  it('validates deterministic rank progression structure', () => {
    expect(RANK_REQUIREMENTS.length).toBe(7);
    expect(RANK_REQUIREMENTS[0].name).toBe('Unranked');
    expect(RANK_REQUIREMENTS[1].name).toBe('Bronze');
    expect(RANK_REQUIREMENTS[2].name).toBe('Silver');
    expect(RANK_REQUIREMENTS[3].name).toBe('Gold');
    expect(RANK_REQUIREMENTS[4].name).toBe('Platinum');
    expect(RANK_REQUIREMENTS[5].name).toBe('Diamond');
    expect(RANK_REQUIREMENTS[6].name).toBe('Crown Ambassador');

    // Milestones
    expect(RANK_REQUIREMENTS[1].milestoneReward).toBe(parseUnits('25', 18));
    expect(RANK_REQUIREMENTS[6].milestoneReward).toBe(parseUnits('20000', 18));
  });
});

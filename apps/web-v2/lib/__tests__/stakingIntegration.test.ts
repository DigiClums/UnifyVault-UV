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
      '0xcbb989e0cf69a1919ed06dd2be88b7310e325b1d',
    );
    expect(DEPLOYED_CONTRACTS_SEPOLIA.ReferralRegistry).toBe(
      '0x810d6450A31E72eB51a37e4A785fF97781E5d3a2',
    );
    expect(DEPLOYED_CONTRACTS_SEPOLIA.RewardDistributor).toBe(
      '0xfd61819e52bfa534eb5d106463f21740c598deb5',
    );
    expect(DEPLOYED_CONTRACTS_SEPOLIA.RewardReserve).toBe(
      '0xB8aA50768F1a3e8fAcE40EdF05e430fA000d6aBb',
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

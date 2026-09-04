import { describe, it, expect } from 'vitest';
import {
  STAKING_VAULT_ABI,
  REFERRAL_REGISTRY_ABI,
  REWARD_DISTRIBUTOR_ABI,
} from '../contracts/staking';
import { DEPLOYED_CONTRACTS_MAINNET } from '../../constants';
import { formatUnits, parseUnits } from 'viem';
import {
  MIN_STAKE_AMOUNT,
  MAX_STAKE_AMOUNT,
  MIN_ACTIVE_STAKE,
  ADMIN_FEE_BPS,
  BPS_DENOMINATOR,
  RANK_REQUIREMENTS,
} from '../../hooks/useStaking';

describe('Staking Contracts & Frontend Integration', () => {
  it('has valid deployed Base Mainnet staking addresses', () => {
    expect(DEPLOYED_CONTRACTS_MAINNET.StakingVault).toBe(
      '0x91744fa47837474c7e9d9d532c7fd8a2fe04c5ee',
    );
    expect(DEPLOYED_CONTRACTS_MAINNET.ReferralRegistry).toBe(
      '0x6a94ee7b0a89ad1b9488b0d29bf99294f5e236d9',
    );
    expect(DEPLOYED_CONTRACTS_MAINNET.RewardDistributor).toBe(
      '0xd3c7073f5a2d98e1f80590b84dd628fcfd6fdbc3',
    );
    expect(DEPLOYED_CONTRACTS_MAINNET.UVBEToken).toBe('0x051979deb1eb4823672e6274a55c44d7818ff523');
    expect(DEPLOYED_CONTRACTS_MAINNET.GenesisReferrer).toBe(
      '0x441dbf8076d0b143EC17199baE94Daa884161454',
    );
  });

  it('contains expected ABIs with all functions for new architecture', () => {
    expect(STAKING_VAULT_ABI.length).toBeGreaterThan(15);
    expect(REFERRAL_REGISTRY_ABI.length).toBeGreaterThan(10);
    expect(REWARD_DISTRIBUTOR_ABI.length).toBeGreaterThan(15);
  });

  it('enforces min 50 UVBE stake and max 100,000 UVBE', () => {
    expect(MIN_STAKE_AMOUNT).toBe(parseUnits('50', 18));
    expect(MAX_STAKE_AMOUNT).toBe(parseUnits('100000', 18));
    expect(MIN_ACTIVE_STAKE).toBe(parseUnits('47.5', 18));
  });

  it('computes 5% treasury fee and 95% protocol-owned capital correctly', () => {
    const stake100 = parseUnits('100', 18);
    const fee = (stake100 * ADMIN_FEE_BPS) / BPS_DENOMINATOR;
    const protocolCapital = stake100 - fee;

    expect(fee).toBe(parseUnits('5', 18));
    expect(protocolCapital).toBe(parseUnits('95', 18));
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
    expect(RANK_REQUIREMENTS[2].milestoneReward).toBe(parseUnits('100', 18));
    expect(RANK_REQUIREMENTS[3].milestoneReward).toBe(parseUnits('500', 18));
    expect(RANK_REQUIREMENTS[4].milestoneReward).toBe(parseUnits('1500', 18));
    expect(RANK_REQUIREMENTS[5].milestoneReward).toBe(parseUnits('5000', 18));
    expect(RANK_REQUIREMENTS[6].milestoneReward).toBe(parseUnits('20000', 18));

    // DAO Leadership Shares
    expect(RANK_REQUIREMENTS[4].daoShares).toBe(1);
    expect(RANK_REQUIREMENTS[5].daoShares).toBe(3);
    expect(RANK_REQUIREMENTS[6].daoShares).toBe(10);
  });
});

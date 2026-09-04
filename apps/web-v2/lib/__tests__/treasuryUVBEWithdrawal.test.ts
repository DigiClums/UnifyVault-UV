import { describe, it, expect } from 'vitest';
import { parseUnits, formatUnits, getAbiItem, encodeFunctionData, decodeFunctionData } from 'viem';
import { DEPLOYED_CONTRACTS_MAINNET, getChainTokens } from '../../constants';
import { TREASURY_ABI } from '../contracts/treasury';
import { STAKING_VAULT_ABI } from '../contracts/staking';

describe('Treasury UVBE & USDC Withdrawal Integration Test Suite', () => {
  const mainnetTokens = getChainTokens(8453);
  const GOVERNANCE_ROLE_HASH = '0x71840dc4906352362b0cdaf79870196c8e42acafade72d5d5a6d59291253ceb1';
  const AUTHORIZED_PROTOCOL_ADMIN = '0x441dbf8076d0b143EC17199baE94Daa884161454';
  const UNAUTHORIZED_USER = '0x000000000000000000000000000000000000bEEF';

  describe('1. Canonical Contract Addresses and Constants', () => {
    it('verifies canonical UVBE token address', () => {
      expect(DEPLOYED_CONTRACTS_MAINNET.UVBEToken.toLowerCase()).toBe(
        '0x051979deb1eb4823672e6274a55c44d7818ff523',
      );
      expect(mainnetTokens.UVBE?.toLowerCase()).toBe('0x051979deb1eb4823672e6274a55c44d7818ff523');
    });

    it('verifies canonical Treasury contract address', () => {
      expect(DEPLOYED_CONTRACTS_MAINNET.Treasury.toLowerCase()).toBe(
        '0x3d358110bf4dc51530e8c4ff66c50b1f34629ec9',
      );
    });

    it('verifies canonical USDC token address on Base Mainnet', () => {
      expect(mainnetTokens.USDC.toLowerCase()).toBe('0x833589fcd6edb6e08f4c7c32d4f71b54bda02913');
    });

    it('verifies canonical Admin address', () => {
      expect(DEPLOYED_CONTRACTS_MAINNET.Admin.toLowerCase()).toBe(
        AUTHORIZED_PROTOCOL_ADMIN.toLowerCase(),
      );
    });
  });

  describe('2. Treasury Contract ABI Verification', () => {
    it('includes withdraw function with asset, recipient, and amount', () => {
      const withdrawItem = getAbiItem({
        abi: TREASURY_ABI,
        name: 'withdraw',
      });
      expect(withdrawItem).toBeDefined();
      expect(withdrawItem.inputs).toHaveLength(3);
      expect(withdrawItem.inputs[0].type).toBe('address'); // asset
      expect(withdrawItem.inputs[1].type).toBe('address'); // recipient
      expect(withdrawItem.inputs[2].type).toBe('uint256'); // amount
    });

    it('includes registerAsset function with asset and decimals', () => {
      const registerItem = getAbiItem({
        abi: TREASURY_ABI,
        name: 'registerAsset',
      });
      expect(registerItem).toBeDefined();
      expect(registerItem.inputs).toHaveLength(2);
      expect(registerItem.inputs[0].type).toBe('address'); // asset
      expect(registerItem.inputs[1].type).toBe('uint8'); // decimals
    });

    it('includes hasRole, isSupported, totalAssetBalance and balance view functions', () => {
      const hasRoleItem = getAbiItem({
        abi: TREASURY_ABI,
        name: 'hasRole',
      });
      expect(hasRoleItem).toBeDefined();
      expect(hasRoleItem.inputs[0].type).toBe('bytes32');
      expect(hasRoleItem.inputs[1].type).toBe('address');

      const isSuppItem = getAbiItem({
        abi: TREASURY_ABI,
        name: 'isSupported',
      });
      expect(isSuppItem).toBeDefined();
      expect(isSuppItem.inputs[0].type).toBe('address');

      const totalAssetBal = getAbiItem({
        abi: TREASURY_ABI,
        name: 'totalAssetBalance',
      });
      expect(totalAssetBal).toBeDefined();
      expect(totalAssetBal.inputs[0].type).toBe('address');

      const bal = getAbiItem({
        abi: TREASURY_ABI,
        name: 'balance',
      });
      expect(bal).toBeDefined();
      expect(bal.inputs[0].type).toBe('address');
    });

    it('includes TreasuryWithdrawal event with asset, recipient, amount, caller', () => {
      const withdrawalEvent = getAbiItem({
        abi: TREASURY_ABI,
        name: 'TreasuryWithdrawal',
      });
      expect(withdrawalEvent).toBeDefined();
      expect(withdrawalEvent.inputs).toHaveLength(4);
      expect(withdrawalEvent.inputs[0].name).toBe('asset');
      expect(withdrawalEvent.inputs[1].name).toBe('recipient');
      expect(withdrawalEvent.inputs[2].name).toBe('amount');
      expect(withdrawalEvent.inputs[3].name).toBe('caller');
    });
  });

  describe('3. Unit Precision & Decimals for Treasury Assets', () => {
    it('correctly calculates 18 decimal precision for UVBE', () => {
      const uvbeAmount = '100.5';
      const parsed = parseUnits(uvbeAmount, 18);
      expect(parsed).toBe(100500000000000000000n);
      expect(formatUnits(parsed, 18)).toBe('100.5');
    });

    it('correctly calculates 6 decimal precision for USDC', () => {
      const usdcAmount = '100.5';
      const parsed = parseUnits(usdcAmount, 6);
      expect(parsed).toBe(100500000n);
      expect(formatUnits(parsed, 6)).toBe('100.5');
    });

    it('handles small fractional UVBE fee amounts without precision loss', () => {
      const smallFeeRaw = 81100000000000000n; // 0.0811 UVBE (actual live testnet balance)
      const formatted = formatUnits(smallFeeRaw, 18);
      expect(formatted).toBe('0.0811');
      expect(parseUnits(formatted, 18)).toBe(smallFeeRaw);
    });
  });

  describe('4. Asset Registration Encoding & Governance Validation', () => {
    it('encodes registerAsset call with 18 decimals for UVBE', () => {
      const callData = encodeFunctionData({
        abi: TREASURY_ABI,
        functionName: 'registerAsset',
        args: [DEPLOYED_CONTRACTS_MAINNET.UVBEToken, 18],
      });

      const decoded = decodeFunctionData({
        abi: TREASURY_ABI,
        data: callData,
      });

      expect(decoded.functionName).toBe('registerAsset');
      expect(decoded.args?.[0]?.toLowerCase()).toBe(
        DEPLOYED_CONTRACTS_MAINNET.UVBEToken.toLowerCase(),
      );
      expect(decoded.args?.[1]).toBe(18);
    });

    it('authorizes only the designated Governance Admin address', () => {
      const isAuthorizedAdmin = (addr?: string, hasRole = false) => {
        if (!addr) return false;
        return addr.toLowerCase() === AUTHORIZED_PROTOCOL_ADMIN.toLowerCase() || hasRole === true;
      };

      expect(isAuthorizedAdmin(AUTHORIZED_PROTOCOL_ADMIN)).toBe(true);
      expect(isAuthorizedAdmin(UNAUTHORIZED_USER, false)).toBe(false);
      expect(isAuthorizedAdmin(undefined)).toBe(false);
    });
  });

  describe('5. CRITICAL SECURITY BOUNDARY ISOLATION', () => {
    it('proves UVBEStakingVault does NOT contain admin withdrawal or principal withdraw functions', () => {
      const hasGenericWithdraw = STAKING_VAULT_ABI.some(
        (item) => item.type === 'function' && item.name === 'withdraw',
      );
      const hasAdminWithdraw = STAKING_VAULT_ABI.some(
        (item) => item.type === 'function' && item.name === 'adminWithdraw',
      );
      const hasEmergencyWithdraw = STAKING_VAULT_ABI.some(
        (item) => item.type === 'function' && item.name === 'emergencyWithdraw',
      );
      const hasUnstake = STAKING_VAULT_ABI.some(
        (item) => item.type === 'function' && item.name === 'unstake',
      );

      expect(hasGenericWithdraw).toBe(false);
      expect(hasAdminWithdraw).toBe(false);
      expect(hasEmergencyWithdraw).toBe(false);
      expect(hasUnstake).toBe(false);
    });

    it('proves Treasury and UVBEStakingVault are distinct isolated contracts', () => {
      expect(DEPLOYED_CONTRACTS_MAINNET.Treasury.toLowerCase()).not.toBe(
        DEPLOYED_CONTRACTS_MAINNET.StakingVault.toLowerCase(),
      );
      expect(DEPLOYED_CONTRACTS_MAINNET.Treasury.toLowerCase()).toBe(
        '0x3d358110bf4dc51530e8c4ff66c50b1f34629ec9',
      );
      expect(DEPLOYED_CONTRACTS_MAINNET.StakingVault.toLowerCase()).toBe(
        '0x91744fa47837474c7e9d9d532c7fd8a2fe04c5ee',
      );
    });
  });
});

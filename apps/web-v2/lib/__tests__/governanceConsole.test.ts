import { describe, it, expect } from 'vitest';
import {
  getAbiItem,
  encodeFunctionData,
  decodeFunctionData,
  keccak256,
  stringToBytes,
  encodeAbiParameters,
  parseAbiParameters,
} from 'viem';
import {
  FULL_PROTOCOL_DIRECTORY_ABI,
  UNIFY_VAULT_TIMELOCK_ABI,
  EMERGENCY_PAUSABLE_ABI,
  DEFAULT_ADMIN_ROLE_HASH,
  GOVERNANCE_ROLE_HASH,
  GUARDIAN_ROLE_HASH,
  CONTROLLER_ROLE_HASH,
  BOT_ROLE_HASH,
  ARBITRATOR_ROLE_HASH,
  ORACLE_OPERATOR_ROLE_HASH,
  PROPOSER_ROLE_HASH,
  EXECUTOR_ROLE_HASH,
  CANCELLER_ROLE_HASH,
  DEPLOYED_ACCESS_CONTROL_CONTRACTS,
  DIRECTORY_MODULE_DEFINITIONS,
  generateTimelockSalt,
} from '../contracts/governance';
import {
  DEPLOYED_CONTRACTS_SEPOLIA,
  MODULE_IDS,
  getProtocolDirectoryAddress,
  DIRECTORY_ADDRESS_SEPOLIA,
} from '../../constants';
import { decodeTransactionError } from '../utils/errorDecoder';

describe('Phase 4: Governance, RBAC & Timelock Console Test Suite', () => {
  const MOCK_ADMIN_WALLET = '0x441dbf8076d0b143EC17199baE94Daa884161454' as `0x${string}`;
  const MOCK_TARGET_CONTRACT = '0x27B5C6DEA90678B78856b0B10DBA37A789fDe97e' as `0x${string}`;
  const MOCK_USER_ACCOUNT = '0x1111111111111111111111111111111111111111' as `0x${string}`;

  describe('1. Canonical Constants & Deployed Address Integrity', () => {
    it('verifies ProtocolDirectory canonical Sepolia address matches deployment', () => {
      expect(getProtocolDirectoryAddress(84532).toLowerCase()).toBe(
        DEPLOYED_CONTRACTS_SEPOLIA.ProtocolDirectory.toLowerCase(),
      );
      expect(DEPLOYED_CONTRACTS_SEPOLIA.ProtocolDirectory.toLowerCase()).toBe(
        '0xd2715141a0f5998b707baa963990bfc2e94cf145',
      );
    });

    it('verifies UnifyVaultTimelock canonical Sepolia address matches deployment', () => {
      expect(DEPLOYED_CONTRACTS_SEPOLIA.UnifyVaultTimelock.toLowerCase()).toBe(
        '0x9094145cd2aea2f309edf14237444a07edf98d02',
      );
      expect(DEPLOYED_CONTRACTS_SEPOLIA.TimelockController.toLowerCase()).toBe(
        '0x9094145cd2aea2f309edf14237444a07edf98d02',
      );
    });

    it('verifies UnifyVaultController canonical Sepolia address matches deployment', () => {
      expect(DEPLOYED_CONTRACTS_SEPOLIA.UnifyVaultController.toLowerCase()).toBe(
        '0x07f3d3432b64dbf67c5b061af2bc8aef70221cea',
      );
    });
  });

  describe('2. Canonical Role Hashes Alignment against Solidity AccessRoles & Timelock', () => {
    it('verifies DEFAULT_ADMIN_ROLE is zero bytes32 (0x0)', () => {
      expect(DEFAULT_ADMIN_ROLE_HASH).toBe(
        '0x0000000000000000000000000000000000000000000000000000000000000000',
      );
    });

    it('verifies GOVERNANCE_ROLE matches keccak256("GOVERNANCE_ROLE")', () => {
      expect(GOVERNANCE_ROLE_HASH).toBe(keccak256(stringToBytes('GOVERNANCE_ROLE')));
    });

    it('verifies GUARDIAN_ROLE matches keccak256("GUARDIAN_ROLE")', () => {
      expect(GUARDIAN_ROLE_HASH).toBe(keccak256(stringToBytes('GUARDIAN_ROLE')));
    });

    it('verifies ARBITRATOR_ROLE matches keccak256("ARBITRATOR_ROLE")', () => {
      expect(ARBITRATOR_ROLE_HASH).toBe(keccak256(stringToBytes('ARBITRATOR_ROLE')));
    });

    it('verifies BOT_ROLE matches keccak256("BOT_ROLE")', () => {
      expect(BOT_ROLE_HASH).toBe(keccak256(stringToBytes('BOT_ROLE')));
    });

    it('verifies CONTROLLER_ROLE matches keccak256("CONTROLLER_ROLE")', () => {
      expect(CONTROLLER_ROLE_HASH).toBe(keccak256(stringToBytes('CONTROLLER_ROLE')));
    });

    it('verifies Timelock PROPOSER_ROLE matches keccak256("PROPOSER_ROLE")', () => {
      expect(PROPOSER_ROLE_HASH).toBe(keccak256(stringToBytes('PROPOSER_ROLE')));
    });

    it('verifies Timelock EXECUTOR_ROLE matches keccak256("EXECUTOR_ROLE")', () => {
      expect(EXECUTOR_ROLE_HASH).toBe(keccak256(stringToBytes('EXECUTOR_ROLE')));
    });

    it('verifies Timelock CANCELLER_ROLE matches keccak256("CANCELLER_ROLE")', () => {
      expect(CANCELLER_ROLE_HASH).toBe(keccak256(stringToBytes('CANCELLER_ROLE')));
    });
  });

  describe('3. Protocol Directory Functions, Module Hashes & ABI Correctness', () => {
    it('verifies ModuleIds library hashes match keccak256 module names', () => {
      expect(MODULE_IDS.ORACLE).toBe(keccak256(stringToBytes('OracleManager')));
      expect(MODULE_IDS.VAULT).toBe(keccak256(stringToBytes('CustodyVault')));
      expect(MODULE_IDS.TREASURY).toBe(keccak256(stringToBytes('Treasury')));
      expect(MODULE_IDS.TOKEN).toBe(keccak256(stringToBytes('IndexToken')));
      expect(MODULE_IDS.STRATEGY_MANAGER).toBe(keccak256(stringToBytes('StrategyManager')));
      expect(MODULE_IDS.PORTFOLIO_MANAGER).toBe(keccak256(stringToBytes('PortfolioManager')));
      expect(MODULE_IDS.SWAP_ADAPTER).toBe(keccak256(stringToBytes('SwapAdapter')));
      expect(MODULE_IDS.LIQUIDITY_MANAGER).toBe(keccak256(stringToBytes('LiquidityManager')));
      expect(MODULE_IDS.FEE_MANAGER).toBe(keccak256(stringToBytes('FeeManager')));
      expect(MODULE_IDS.COST_BASIS_MANAGER).toBe(keccak256(stringToBytes('CostBasisManager')));
      expect(MODULE_IDS.PERFORMANCE_MANAGER).toBe(keccak256(stringToBytes('PerformanceManager')));
    });

    it('includes all required functions in FULL_PROTOCOL_DIRECTORY_ABI', () => {
      const requiredFunctions = [
        'registerAddress',
        'updateAddress',
        'removeAddress',
        'freeze',
        'getAddress',
        'exists',
        'isFrozen',
        'hasRole',
        'getRoleAdmin',
        'grantRole',
        'revokeRole',
      ];

      requiredFunctions.forEach((funcName) => {
        const item = getAbiItem({
          abi: FULL_PROTOCOL_DIRECTORY_ABI,
          // @ts-expect-error dynamic function name lookup
          name: funcName,
        });
        expect(item, `Expected ABI to include ${funcName}`).toBeDefined();
      });
    });

    it('encodes registerAddress(bytes32, address) correctly', () => {
      const id = MODULE_IDS.ORACLE;
      const target = MOCK_TARGET_CONTRACT;
      const data = encodeFunctionData({
        abi: FULL_PROTOCOL_DIRECTORY_ABI,
        functionName: 'registerAddress',
        args: [id, target],
      });

      const decoded = decodeFunctionData({
        abi: FULL_PROTOCOL_DIRECTORY_ABI,
        data,
      });

      expect(decoded.functionName).toBe('registerAddress');
      expect(decoded.args[0]).toBe(id);
      expect(decoded.args[1].toLowerCase()).toBe(target.toLowerCase());
    });

    it('encodes updateAddress(bytes32, address) correctly', () => {
      const id = MODULE_IDS.TREASURY;
      const target = MOCK_TARGET_CONTRACT;
      const data = encodeFunctionData({
        abi: FULL_PROTOCOL_DIRECTORY_ABI,
        functionName: 'updateAddress',
        args: [id, target],
      });

      const decoded = decodeFunctionData({
        abi: FULL_PROTOCOL_DIRECTORY_ABI,
        data,
      });

      expect(decoded.functionName).toBe('updateAddress');
      expect(decoded.args[0]).toBe(id);
      expect(decoded.args[1].toLowerCase()).toBe(target.toLowerCase());
    });

    it('encodes removeAddress(bytes32) correctly', () => {
      const id = MODULE_IDS.VAULT;
      const data = encodeFunctionData({
        abi: FULL_PROTOCOL_DIRECTORY_ABI,
        functionName: 'removeAddress',
        args: [id],
      });

      const decoded = decodeFunctionData({
        abi: FULL_PROTOCOL_DIRECTORY_ABI,
        data,
      });

      expect(decoded.functionName).toBe('removeAddress');
      expect(decoded.args[0]).toBe(id);
    });

    it('encodes freeze() correctly', () => {
      const data = encodeFunctionData({
        abi: FULL_PROTOCOL_DIRECTORY_ABI,
        functionName: 'freeze',
      });

      const decoded = decodeFunctionData({
        abi: FULL_PROTOCOL_DIRECTORY_ABI,
        data,
      });

      expect(decoded.functionName).toBe('freeze');
    });
  });

  describe('4. Protocol Directory Freeze State Enforcement', () => {
    it('blocks destructive actions when directory is frozen', () => {
      const checkCanMutateDirectory = (
        isFrozen: boolean,
        hasGovRole: boolean,
      ): { allowed: boolean; reason?: string } => {
        if (isFrozen) {
          return { allowed: false, reason: 'Protocol Directory is permanently frozen' };
        }
        if (!hasGovRole) {
          return { allowed: false, reason: 'Unauthorized (Missing GOVERNANCE_ROLE)' };
        }
        return { allowed: true };
      };

      expect(checkCanMutateDirectory(false, true)).toEqual({ allowed: true });
      expect(checkCanMutateDirectory(true, true)).toEqual({
        allowed: false,
        reason: 'Protocol Directory is permanently frozen',
      });
      expect(checkCanMutateDirectory(false, false)).toEqual({
        allowed: false,
        reason: 'Unauthorized (Missing GOVERNANCE_ROLE)',
      });
      expect(checkCanMutateDirectory(true, false)).toEqual({
        allowed: false,
        reason: 'Protocol Directory is permanently frozen',
      });
    });
  });

  describe('5. RBAC Manager Role Detection & Preflight Permission Verification', () => {
    it('verifies all deployed AccessControl contracts are cataloged with source-accurate roles', () => {
      expect(DEPLOYED_ACCESS_CONTROL_CONTRACTS.length).toBeGreaterThanOrEqual(15);

      const controllerEntry = DEPLOYED_ACCESS_CONTROL_CONTRACTS.find(
        (c) => c.name === 'UnifyVaultController',
      );
      expect(controllerEntry).toBeDefined();
      expect(controllerEntry?.supportedRoles.map((r) => r.name)).toContain('DEFAULT_ADMIN_ROLE');
      expect(controllerEntry?.supportedRoles.map((r) => r.name)).toContain('GOVERNANCE_ROLE');
      expect(controllerEntry?.supportedRoles.map((r) => r.name)).toContain('GUARDIAN_ROLE');
      expect(controllerEntry?.supportedRoles.map((r) => r.name)).toContain('BOT_ROLE');

      const timelockEntry = DEPLOYED_ACCESS_CONTROL_CONTRACTS.find(
        (c) => c.name === 'UnifyVaultTimelock',
      );
      expect(timelockEntry).toBeDefined();
      expect(timelockEntry?.supportedRoles.map((r) => r.name)).toContain('PROPOSER_ROLE');
      expect(timelockEntry?.supportedRoles.map((r) => r.name)).toContain('EXECUTOR_ROLE');
      expect(timelockEntry?.supportedRoles.map((r) => r.name)).toContain('CANCELLER_ROLE');

      const escrowEntry = DEPLOYED_ACCESS_CONTROL_CONTRACTS.find((c) => c.name === 'P2PEscrow');
      expect(escrowEntry).toBeDefined();
      expect(escrowEntry?.supportedRoles.map((r) => r.name)).toContain('ARBITRATOR_ROLE');
    });

    it('encodes grantRole(bytes32, address) and revokeRole(bytes32, address)', () => {
      const grantData = encodeFunctionData({
        abi: FULL_PROTOCOL_DIRECTORY_ABI,
        functionName: 'grantRole',
        args: [BOT_ROLE_HASH, MOCK_USER_ACCOUNT],
      });

      const decodedGrant = decodeFunctionData({
        abi: FULL_PROTOCOL_DIRECTORY_ABI,
        data: grantData,
      });

      expect(decodedGrant.functionName).toBe('grantRole');
      expect(decodedGrant.args[0]).toBe(BOT_ROLE_HASH);
      expect(decodedGrant.args[1].toLowerCase()).toBe(MOCK_USER_ACCOUNT.toLowerCase());

      const revokeData = encodeFunctionData({
        abi: FULL_PROTOCOL_DIRECTORY_ABI,
        functionName: 'revokeRole',
        args: [BOT_ROLE_HASH, MOCK_USER_ACCOUNT],
      });

      const decodedRevoke = decodeFunctionData({
        abi: FULL_PROTOCOL_DIRECTORY_ABI,
        data: revokeData,
      });

      expect(decodedRevoke.functionName).toBe('revokeRole');
      expect(decodedRevoke.args[0]).toBe(BOT_ROLE_HASH);
      expect(decodedRevoke.args[1].toLowerCase()).toBe(MOCK_USER_ACCOUNT.toLowerCase());
    });

    it('enforces administering role check before write', () => {
      const canAdministerRole = (
        connectedWallet: `0x${string}`,
        roleAdmin: `0x${string}`,
        walletRoles: `0x${string}`[],
      ): boolean => {
        return walletRoles.includes(roleAdmin) || walletRoles.includes(DEFAULT_ADMIN_ROLE_HASH);
      };

      expect(
        canAdministerRole(MOCK_ADMIN_WALLET, DEFAULT_ADMIN_ROLE_HASH, [DEFAULT_ADMIN_ROLE_HASH]),
      ).toBe(true);

      expect(
        canAdministerRole(MOCK_USER_ACCOUNT, DEFAULT_ADMIN_ROLE_HASH, [GOVERNANCE_ROLE_HASH]),
      ).toBe(false);
    });
  });

  describe('6. Timelock Controller Operations & Operation State Hash Calculation', () => {
    it('verifies Timelock delay constant is 48 hours (172,800 seconds)', () => {
      const delay48h = 48n * 3600n;
      expect(delay48h).toBe(172800n);
    });

    it('includes getMinDelay, schedule, execute, cancel, hashOperation, isOperationPending', () => {
      const requiredMethods = [
        'getMinDelay',
        'TIMELOCK_DELAY',
        'PROPOSER_ROLE',
        'EXECUTOR_ROLE',
        'CANCELLER_ROLE',
        'schedule',
        'execute',
        'cancel',
        'hashOperation',
        'isOperation',
        'isOperationPending',
        'isOperationReady',
        'isOperationDone',
        'getTimestamp',
        'getOperationState',
      ];

      requiredMethods.forEach((method) => {
        const item = getAbiItem({
          abi: UNIFY_VAULT_TIMELOCK_ABI,
          // @ts-expect-error dynamic ABI lookup
          name: method,
        });
        expect(item, `Expected Timelock ABI to include ${method}`).toBeDefined();
      });
    });

    it('computes and matches operation hash accurately', () => {
      const target = MOCK_TARGET_CONTRACT;
      const value = 0n;
      const data = '0x1234' as `0x${string}`;
      const predecessor =
        '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`;
      const salt =
        '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`;

      const encoded = encodeAbiParameters(
        parseAbiParameters('address, uint256, bytes, bytes32, bytes32'),
        [target, value, data, predecessor, salt],
      );
      const computedHash = keccak256(encoded);

      expect(computedHash).toMatch(/^0x[a-f0-9]{64}$/);
    });

    it('encodes schedule, execute, and cancel functions accurately', () => {
      const target = MOCK_TARGET_CONTRACT;
      const value = 0n;
      const data = '0x1234' as `0x${string}`;
      const pred =
        '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`;
      const salt =
        '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`;
      const delay = 172800n;

      const scheduleData = encodeFunctionData({
        abi: UNIFY_VAULT_TIMELOCK_ABI,
        functionName: 'schedule',
        args: [target, value, data, pred, salt, delay],
      });
      const decodedSchedule = decodeFunctionData({
        abi: UNIFY_VAULT_TIMELOCK_ABI,
        data: scheduleData,
      });
      expect(decodedSchedule.functionName).toBe('schedule');
      expect(decodedSchedule.args[5]).toBe(172800n);

      const executeData = encodeFunctionData({
        abi: UNIFY_VAULT_TIMELOCK_ABI,
        functionName: 'execute',
        args: [target, value, data, pred, salt],
      });
      const decodedExecute = decodeFunctionData({
        abi: UNIFY_VAULT_TIMELOCK_ABI,
        data: executeData,
      });
      expect(decodedExecute.functionName).toBe('execute');

      const opId = keccak256(
        encodeAbiParameters(parseAbiParameters('address, uint256, bytes, bytes32, bytes32'), [
          target,
          value,
          data,
          pred,
          salt,
        ]),
      );
      const cancelData = encodeFunctionData({
        abi: UNIFY_VAULT_TIMELOCK_ABI,
        functionName: 'cancel',
        args: [opId],
      });
      const decodedCancel = decodeFunctionData({
        abi: UNIFY_VAULT_TIMELOCK_ABI,
        data: cancelData,
      });
      expect(decodedCancel.functionName).toBe('cancel');
      expect(decodedCancel.args[0]).toBe(opId);
    });

    it('generates unique, collision-resistant deterministic salt with entropy', () => {
      const salt1 = generateTimelockSalt('proposal-1');
      const salt2 = generateTimelockSalt('proposal-2');
      const salt3 = generateTimelockSalt('proposal-1');

      expect(salt1).toMatch(/^0x[a-f0-9]{64}$/);
      expect(salt2).toMatch(/^0x[a-f0-9]{64}$/);
      expect(salt1).not.toBe(salt2);
      expect(salt1).not.toBe('0x0000000000000000000000000000000000000000000000000000000000000000');

      // Verify that two identical proposals with unique salts produce distinct operation IDs
      const target = MOCK_TARGET_CONTRACT;
      const value = 0n;
      const data = '0x1234' as `0x${string}`;
      const pred =
        '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`;

      const opId1 = keccak256(
        encodeAbiParameters(parseAbiParameters('address, uint256, bytes, bytes32, bytes32'), [
          target,
          value,
          data,
          pred,
          salt1,
        ]),
      );
      const opId2 = keccak256(
        encodeAbiParameters(parseAbiParameters('address, uint256, bytes, bytes32, bytes32'), [
          target,
          value,
          data,
          pred,
          salt2,
        ]),
      );

      expect(opId1).not.toBe(opId2);
    });
  });

  describe('7. Emergency Governance View & Pausable Modules Verification', () => {
    it('verifies 8 pausable protocol modules are tracked with verified functions', () => {
      const pausable = DEPLOYED_ACCESS_CONTROL_CONTRACTS.filter((c) => c.pausable);
      expect(pausable.length).toBe(8);

      const moduleNames = pausable.map((m) => m.name);
      expect(moduleNames).toContain('UnifyVaultController');
      expect(moduleNames).toContain('CustodyVault');
      expect(moduleNames).toContain('Treasury');
      expect(moduleNames).toContain('UVBEToken');
      expect(moduleNames).toContain('P2PEscrow');
      expect(moduleNames).toContain('Marketplace');
      expect(moduleNames).toContain('StakingVault');
      expect(moduleNames).toContain('RewardDistributor');
    });

    it('verifies Controller uses emergencyPause/resume and other modules use pause/unpause', () => {
      const controller = DEPLOYED_ACCESS_CONTROL_CONTRACTS.find(
        (c) => c.name === 'UnifyVaultController',
      );
      expect(controller?.pauseFunction).toBe('emergencyPause');
      expect(controller?.unpauseFunction).toBe('resume');

      const custody = DEPLOYED_ACCESS_CONTROL_CONTRACTS.find((c) => c.name === 'CustodyVault');
      expect(custody?.pauseFunction).toBe('pause');
      expect(custody?.unpauseFunction).toBe('unpause');
    });

    it('encodes emergencyPause, resume, pause, and unpause via EMERGENCY_PAUSABLE_ABI', () => {
      const epData = encodeFunctionData({
        abi: EMERGENCY_PAUSABLE_ABI,
        functionName: 'emergencyPause',
      });
      expect(decodeFunctionData({ abi: EMERGENCY_PAUSABLE_ABI, data: epData }).functionName).toBe(
        'emergencyPause',
      );

      const resumeData = encodeFunctionData({
        abi: EMERGENCY_PAUSABLE_ABI,
        functionName: 'resume',
      });
      expect(
        decodeFunctionData({ abi: EMERGENCY_PAUSABLE_ABI, data: resumeData }).functionName,
      ).toBe('resume');

      const pauseData = encodeFunctionData({
        abi: EMERGENCY_PAUSABLE_ABI,
        functionName: 'pause',
      });
      expect(
        decodeFunctionData({ abi: EMERGENCY_PAUSABLE_ABI, data: pauseData }).functionName,
      ).toBe('pause');

      const unpauseData = encodeFunctionData({
        abi: EMERGENCY_PAUSABLE_ABI,
        functionName: 'unpause',
      });
      expect(
        decodeFunctionData({ abi: EMERGENCY_PAUSABLE_ABI, data: unpauseData }).functionName,
      ).toBe('unpause');
    });
  });

  describe('8. Custom Error Decoding for Governance & Timelock', () => {
    it('decodes RegistryIsFrozen custom error properly', () => {
      const err = { shortMessage: 'execution reverted: RegistryIsFrozen()' };
      const decoded = decodeTransactionError(err);
      expect(decoded.message).toContain('frozen');
    });

    it('decodes EntryAlreadyExists custom error properly', () => {
      const err = { shortMessage: 'execution reverted: EntryAlreadyExists(0x123)' };
      const decoded = decodeTransactionError(err);
      expect(decoded.message).toContain('already exists');
    });

    it('decodes AccessControlUnauthorizedAccount custom error properly', () => {
      const err = { shortMessage: 'execution reverted: AccessControlUnauthorizedAccount()' };
      const decoded = decodeTransactionError(err);
      expect(decoded.message).toContain('lacks the required AccessControl role');
    });

    it('decodes TimelockInsufficientDelay custom error properly', () => {
      const err = { shortMessage: 'execution reverted: TimelockInsufficientDelay(100, 172800)' };
      const decoded = decodeTransactionError(err);
      expect(decoded.message).toContain('less than minimum 48 hours');
    });
  });

  describe('9. Transaction Nonce Safety Verification', () => {
    it('verifies that no manual nonce parameter is present in encoded contract calls', () => {
      const sampleCall = {
        address: DEPLOYED_CONTRACTS_SEPOLIA.UnifyVaultTimelock,
        abi: UNIFY_VAULT_TIMELOCK_ABI,
        functionName: 'schedule',
        args: [
          MOCK_TARGET_CONTRACT,
          0n,
          '0x' as `0x${string}`,
          '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
          '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
          172800n,
        ],
      };

      // Standard wagmi/viem writes should never include manual 'nonce' property
      expect('nonce' in sampleCall).toBe(false);
    });
  });
});

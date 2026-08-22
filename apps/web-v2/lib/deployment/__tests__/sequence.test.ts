import { describe, it, expect } from 'vitest';
import {
  FRESH_BASE_SEPOLIA_DEPLOYMENT_STEPS,
  BASE_SEPOLIA_CHAIN_ID,
  BASE_SEPOLIA_ASSETS,
  BASE_SEPOLIA_FEEDS,
  MODULE_IDS,
  ACCESS_ROLES,
} from '../freshBaseSepoliaSequence';
import { DEPLOYMENT_ARTIFACTS } from '../generatedArtifacts';
import type { DeploymentContext } from '../types';

describe('FreshBaseSepolia Deployment Sequence', () => {
  it('should contain exactly 55 sequential transactions', () => {
    expect(FRESH_BASE_SEPOLIA_DEPLOYMENT_STEPS).toHaveLength(55);
    FRESH_BASE_SEPOLIA_DEPLOYMENT_STEPS.forEach((step, idx) => {
      expect(step.stepNumber).toBe(idx + 1);
    });
  });

  it('should have 16 DEPLOY steps and 39 CALL steps', () => {
    const deploySteps = FRESH_BASE_SEPOLIA_DEPLOYMENT_STEPS.filter((s) => s.type === 'DEPLOY');
    const callSteps = FRESH_BASE_SEPOLIA_DEPLOYMENT_STEPS.filter((s) => s.type === 'CALL');

    expect(deploySteps).toHaveLength(16);
    expect(callSteps).toHaveLength(39);
  });

  it('should target Base Sepolia Chain ID 84532', () => {
    expect(BASE_SEPOLIA_CHAIN_ID).toBe(84532);
  });

  it('should have artifacts for all 16 deployed contracts', () => {
    const expectedContracts = [
      'ProtocolDirectory',
      'OracleManager',
      'ChainlinkOracleProvider',
      'Treasury',
      'FeeManager',
      'CustodyVault',
      'LiquidityManager',
      'UVBEV2',
      'SwapAdapter',
      'StrategyManager',
      'PortfolioManager',
      'UnifyVaultController',
      'CostBasisManagerV2',
      'P2PEscrowV2',
      'PerformanceManager',
      'Marketplace',
    ];

    expectedContracts.forEach((contractName) => {
      expect(DEPLOYMENT_ARTIFACTS[contractName]).toBeDefined();
      expect(DEPLOYMENT_ARTIFACTS[contractName].bytecode.length).toBeGreaterThan(10);
      expect(DEPLOYMENT_ARTIFACTS[contractName].abi.length).toBeGreaterThan(0);
    });
  });

  it('should resolve execution data across the entire pipeline without errors', () => {
    const mockDeployer = '0x1804c8AB1F12E6bbf3894d4083f33e07309d1f38' as const;

    // Simulate dummy deployed addresses
    const mockDeployedContracts: DeploymentContext['deployedContracts'] = {
      ProtocolDirectory: '0x5b73C5498c1E3b4dbA84de0F1833c4a029d90519',
      OracleManager: '0x7FA9385bE102ac3EAc297483Dd6233D62b3e1496',
      ChainlinkOracleProvider: '0x34A1D3fff3958843C43aD80F30b94c510645C316',
      Treasury: '0x90193C961A926261B756D1E5bb255e67ff9498A1',
      FeeManager: '0xA8452Ec99ce0C64f20701dB7dD3abDb607c00496',
      CustodyVault: '0xBb2180ebd78ce97360503434eD37fcf4a1Df61c3',
      LiquidityManager: '0xDB8cFf278adCCF9E9b5da745B44E754fC4EE3C76',
      UVBEV2: '0x50EEf481cae4250d252Ae577A09bF514f224C6C4',
      StrategyManager: '0xDEb1E9a6Be7Baf84208BB6E10aC9F9bbE1D70809',
      PortfolioManager: '0xD718d5A27a29FF1cD22403426084bA0d479869a0',
      SwapAdapter: '0x62c20Aa1e0272312BC100b4e23B4DC1Ed96dD7D1',
      CostBasisManagerV2: '0x416C42991d05b31E9A6dC209e91AD22b79D87Ae6',
      P2PEscrowV2: '0xd21060559c9beb54fC07aFd6151aDf6cFCDDCAeB',
      PerformanceManager: '0x4C52a6277b1B84121b3072C0c92b6Be0b7CC10F1',
      UnifyVaultController: '0x4f559F30f5eB88D635FDe1548C4267DB8FaB0351',
      Marketplace: '0x3333333333333333333333333333333333333333',
    };

    const ctx: DeploymentContext = {
      chainId: BASE_SEPOLIA_CHAIN_ID,
      deployerAddress: mockDeployer,
      deployedContracts: mockDeployedContracts,
    };

    FRESH_BASE_SEPOLIA_DEPLOYMENT_STEPS.forEach((step) => {
      const data = step.getExecutionData(ctx);
      expect(data).toBeDefined();
      if (data.type === 'DEPLOY') {
        expect(data.bytecode.startsWith('0x')).toBe(true);
      } else {
        expect(data.targetAddress.startsWith('0x')).toBe(true);
        expect(data.functionName).toBeDefined();
      }
    });
  });

  it('Step 53 must revoke deployer CONTROLLER_ROLE from UVBEV2', () => {
    const step53 = FRESH_BASE_SEPOLIA_DEPLOYMENT_STEPS[52];
    expect(step53.stepNumber).toBe(53);
    expect(step53.contractName).toBe('UVBEV2');
    expect(step53.functionName).toBe('revokeRole');

    const ctx: DeploymentContext = {
      chainId: BASE_SEPOLIA_CHAIN_ID,
      deployerAddress: '0x1804c8AB1F12E6bbf3894d4083f33e07309d1f38',
      deployedContracts: { UVBEV2: '0x50EEf481cae4250d252Ae577A09bF514f224C6C4' },
    };

    const execData = step53.getExecutionData(ctx);
    expect(execData.type).toBe('CALL');
    if (execData.type === 'CALL') {
      expect(execData.args[0]).toBe(ACCESS_ROLES.CONTROLLER_ROLE);
      expect(execData.args[1]).toBe(ctx.deployerAddress);
    }
  });

  it('Step 54 must deploy Marketplace with fresh P2PEscrowV2 constructor argument', () => {
    const step54 = FRESH_BASE_SEPOLIA_DEPLOYMENT_STEPS[53];
    expect(step54.stepNumber).toBe(54);
    expect(step54.contractName).toBe('Marketplace');
    expect(step54.type).toBe('DEPLOY');

    const mockEscrow = '0xcba65af8a993061cf1acc47d9b02d7ebacbcf655' as const;
    const ctx: DeploymentContext = {
      chainId: BASE_SEPOLIA_CHAIN_ID,
      deployerAddress: '0x441dbf8076d0b143EC17199baE94Daa884161454',
      deployedContracts: { P2PEscrowV2: mockEscrow },
    };

    const execData = step54.getExecutionData(ctx);
    expect(execData.type).toBe('DEPLOY');
    if (execData.type === 'DEPLOY') {
      expect(execData.args[0]).toBe(mockEscrow);
    }
  });

  it('Step 55 must configure canonical UVBEV2 token on Marketplace', () => {
    const step55 = FRESH_BASE_SEPOLIA_DEPLOYMENT_STEPS[54];
    expect(step55.stepNumber).toBe(55);
    expect(step55.contractName).toBe('Marketplace');
    expect(step55.type).toBe('CALL');
    expect(step55.functionName).toBe('setUvbeToken');

    const mockMarketplace = '0x3333333333333333333333333333333333333333' as const;
    const mockUvbe = '0xd1716dbfadda94ab2b6f8b0a759d2cfeb26cec4c' as const;
    const ctx: DeploymentContext = {
      chainId: BASE_SEPOLIA_CHAIN_ID,
      deployerAddress: '0x441dbf8076d0b143EC17199baE94Daa884161454',
      deployedContracts: { Marketplace: mockMarketplace, UVBEV2: mockUvbe },
    };

    const execData = step55.getExecutionData(ctx);
    expect(execData.type).toBe('CALL');
    if (execData.type === 'CALL') {
      expect(execData.targetAddress).toBe(mockMarketplace);
      expect(execData.args[0]).toBe(mockUvbe);
    }
  });
});

import type { Abi } from 'viem';

export type DeploymentPhase =
  | 'core_contracts'
  | 'directory_registration'
  | 'module_sync'
  | 'oracle_config'
  | 'asset_registration'
  | 'controller_config'
  | 'access_control'
  | 'marketplace';

export interface DeployedContractsMap {
  ProtocolDirectory?: `0x${string}`;
  OracleManager?: `0x${string}`;
  ChainlinkOracleProvider?: `0x${string}`;
  Treasury?: `0x${string}`;
  FeeManager?: `0x${string}`;
  CustodyVault?: `0x${string}`;
  LiquidityManager?: `0x${string}`;
  UVBEV2?: `0x${string}`;
  SwapAdapter?: `0x${string}`;
  StrategyManager?: `0x${string}`;
  PortfolioManager?: `0x${string}`;
  UnifyVaultController?: `0x${string}`;
  CostBasisManagerV2?: `0x${string}`;
  P2PEscrowV2?: `0x${string}`;
  PerformanceManager?: `0x${string}`;
  Marketplace?: `0x${string}`;
  UnifyVaultTimelock?: `0x${string}`;
  UVBEStakingVault?: `0x${string}`;
  UVBEReferralRegistry?: `0x${string}`;
  UVBERewardDistributor?: `0x${string}`;
  P2PReputation?: `0x${string}`;
  UnifyVaultPaymaster?: `0x${string}`;
  GasTreasury?: `0x${string}`;
}

export interface DeploymentContext {
  chainId: number;
  deployerAddress: `0x${string}`;
  deployedContracts: DeployedContractsMap;
}

export interface StepDeployData {
  type: 'DEPLOY';
  abi: Abi;
  bytecode: `0x${string}`;
  args: readonly unknown[];
}

export interface StepCallData {
  type: 'CALL';
  targetAddress: `0x${string}`;
  abi: Abi;
  functionName: string;
  args: readonly unknown[];
}

export type StepExecutionData = StepDeployData | StepCallData;

export interface DeploymentStepDefinition {
  stepNumber: number;
  id: string;
  title: string;
  phaseNumber: number;
  phaseName: string;
  category: DeploymentPhase;
  contractName: string;
  type: 'DEPLOY' | 'CALL';
  functionName: string;
  description: string;
  expectedGasLimit: bigint;
  getExecutionData: (ctx: DeploymentContext) => StepExecutionData;
}

export type StepStatus =
  'idle' | 'ready' | 'signing' | 'confirming' | 'confirmed' | 'rejected' | 'failed' | 'skipped';

export interface StepExecutionRecord {
  stepNumber: number;
  stepId: string;
  txHash?: `0x${string}`;
  status: StepStatus;
  blockNumber?: number;
  gasUsed?: string;
  effectiveGasPrice?: string;
  deployedAddress?: `0x${string}`;
  error?: string;
  timestamp?: number;
}

export interface GenesisVerificationCheck {
  id: string;
  name: string;
  contractName: string;
  targetAddress?: `0x${string}`;
  passed: boolean;
  expected: string;
  actual: string;
  error?: string;
}

export interface DeploymentSessionState {
  version: 1;
  chainId: number;
  deployerAddress: `0x${string}`;
  currentStepIndex: number;
  deployedContracts: DeployedContractsMap;
  stepRecords: Record<number, StepExecutionRecord>;
  verificationResults: GenesisVerificationCheck[];
  lastUpdated: number;
  isComplete: boolean;
}

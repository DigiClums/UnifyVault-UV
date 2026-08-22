import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { readDeploymentManifest } from '../../../../lib/deployment/manifestStore';
import type { DeployedContractsMap } from '../../../../lib/deployment/types';

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const chainIdParam = searchParams.get('chainId');
    const chainId = chainIdParam ? Number(chainIdParam) : 84532;

    const manifest = await readDeploymentManifest(chainId);
    if (!manifest || !manifest.contracts || Object.keys(manifest.contracts).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No contracts found in deployment manifest. Please deploy first.',
        },
        { status: 400 },
      );
    }

    const c: DeployedContractsMap = manifest.contracts;
    const isSepolia = chainId === 84532;
    const isMainnet = chainId === 8453;

    // 1. Update .env.local if present
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      let envContent = await fs.promises.readFile(envPath, 'utf-8');

      if (isSepolia) {
        if (c.ProtocolDirectory)
          envContent = replaceOrAppendEnv(
            envContent,
            'NEXT_PUBLIC_DIRECTORY_ADDRESS_SEPOLIA',
            c.ProtocolDirectory,
          );
        if (c.P2PEscrowV2)
          envContent = replaceOrAppendEnv(
            envContent,
            'NEXT_PUBLIC_P2P_ESCROW_ADDRESS_SEPOLIA',
            c.P2PEscrowV2,
          );
        if (c.UVBEV2)
          envContent = replaceOrAppendEnv(
            envContent,
            'NEXT_PUBLIC_UVBE_TOKEN_ADDRESS_SEPOLIA',
            c.UVBEV2,
          );
        if (c.UnifyVaultController)
          envContent = replaceOrAppendEnv(
            envContent,
            'NEXT_PUBLIC_CONTROLLER_ADDRESS_SEPOLIA',
            c.UnifyVaultController,
          );
        if (c.PortfolioManager)
          envContent = replaceOrAppendEnv(
            envContent,
            'NEXT_PUBLIC_PORTFOLIO_MANAGER_ADDRESS_SEPOLIA',
            c.PortfolioManager,
          );
        if (c.Marketplace)
          envContent = replaceOrAppendEnv(
            envContent,
            'NEXT_PUBLIC_MARKETPLACE_ADDRESS_SEPOLIA',
            c.Marketplace,
          );
      } else if (isMainnet) {
        if (c.ProtocolDirectory)
          envContent = replaceOrAppendEnv(
            envContent,
            'NEXT_PUBLIC_DIRECTORY_ADDRESS_MAINNET',
            c.ProtocolDirectory,
          );
        if (c.P2PEscrowV2)
          envContent = replaceOrAppendEnv(
            envContent,
            'NEXT_PUBLIC_P2P_ESCROW_ADDRESS_MAINNET',
            c.P2PEscrowV2,
          );
        if (c.UVBEV2)
          envContent = replaceOrAppendEnv(
            envContent,
            'NEXT_PUBLIC_UVBE_TOKEN_ADDRESS_MAINNET',
            c.UVBEV2,
          );
        if (c.UnifyVaultController)
          envContent = replaceOrAppendEnv(
            envContent,
            'NEXT_PUBLIC_CONTROLLER_ADDRESS_MAINNET',
            c.UnifyVaultController,
          );
        if (c.PortfolioManager)
          envContent = replaceOrAppendEnv(
            envContent,
            'NEXT_PUBLIC_PORTFOLIO_MANAGER_ADDRESS_MAINNET',
            c.PortfolioManager,
          );
        if (c.Marketplace)
          envContent = replaceOrAppendEnv(
            envContent,
            'NEXT_PUBLIC_MARKETPLACE_ADDRESS_MAINNET',
            c.Marketplace,
          );
      }

      await fs.promises.writeFile(envPath, envContent, 'utf-8');
    }

    // 2. Update constants/index.ts DEPLOYED_CONTRACTS_SEPOLIA
    const constantsPath = path.resolve(process.cwd(), 'constants', 'index.ts');
    if (fs.existsSync(constantsPath)) {
      let constantsContent = await fs.promises.readFile(constantsPath, 'utf-8');

      if (isSepolia && c.ProtocolDirectory) {
        if (c.ProtocolDirectory) {
          constantsContent = updateConstantField(
            constantsContent,
            'ProtocolDirectory',
            c.ProtocolDirectory,
          );
        }
        if (c.Treasury) {
          constantsContent = updateConstantField(constantsContent, 'Treasury', c.Treasury);
        }
        if (c.CustodyVault) {
          constantsContent = updateConstantField(constantsContent, 'CustodyVault', c.CustodyVault);
        }
        if (c.OracleManager) {
          constantsContent = updateConstantField(
            constantsContent,
            'OracleManager',
            c.OracleManager,
          );
        }
        if (c.ChainlinkOracleProvider) {
          constantsContent = updateConstantField(
            constantsContent,
            'ChainlinkOracleProvider',
            c.ChainlinkOracleProvider,
          );
        }
        if (c.LiquidityManager) {
          constantsContent = updateConstantField(
            constantsContent,
            'LiquidityManager',
            c.LiquidityManager,
          );
        }
        if (c.UVBEV2) {
          constantsContent = updateConstantField(constantsContent, 'UVBEToken', c.UVBEV2);
          constantsContent = updateConstantField(constantsContent, 'UVBTCETHToken', c.UVBEV2);
        }
        if (c.UnifyVaultController) {
          constantsContent = updateConstantField(
            constantsContent,
            'UnifyVaultController',
            c.UnifyVaultController,
          );
          constantsContent = updateConstantField(
            constantsContent,
            'UnifyVaultControllerImplementation',
            c.UnifyVaultController,
          );
        }
        if (c.StrategyManager) {
          constantsContent = updateConstantField(
            constantsContent,
            'StrategyManager',
            c.StrategyManager,
          );
        }
        if (c.PortfolioManager) {
          constantsContent = updateConstantField(
            constantsContent,
            'PortfolioManager',
            c.PortfolioManager,
          );
        }
        if (c.SwapAdapter) {
          constantsContent = updateConstantField(constantsContent, 'SwapAdapter', c.SwapAdapter);
        }
        if (c.FeeManager) {
          constantsContent = updateConstantField(constantsContent, 'FeeManager', c.FeeManager);
        }
        if (c.CostBasisManagerV2) {
          constantsContent = updateConstantField(
            constantsContent,
            'CostBasisManager',
            c.CostBasisManagerV2,
          );
        }
        if (c.PerformanceManager) {
          constantsContent = updateConstantField(
            constantsContent,
            'PerformanceManager',
            c.PerformanceManager,
          );
        }
        if (c.P2PEscrowV2) {
          constantsContent = updateConstantField(constantsContent, 'P2PEscrow', c.P2PEscrowV2);
        }
        if (c.Marketplace) {
          constantsContent = updateConstantField(constantsContent, 'Marketplace', c.Marketplace);
        }
      }

      await fs.promises.writeFile(constantsPath, constantsContent, 'utf-8');
    }

    return NextResponse.json({
      success: true,
      message:
        'All deployed contracts successfully bound to frontend constants, .env.local, and registry!',
      boundContracts: c,
    });
  } catch (err: any) {
    console.error('[API /deployment/bind POST] Error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error binding contracts.' },
      { status: 500 },
    );
  }
}

function replaceOrAppendEnv(content: string, key: string, value?: string): string {
  if (!value) return content;
  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(content)) {
    return content.replace(regex, `${key}=${value}`);
  }
  return `${content}\n${key}=${value}`;
}

function updateConstantField(content: string, fieldName: string, address: string): string {
  const simpleRegex = new RegExp(`(${fieldName}:\\s*\x27)0x[a-fA-F0-9]{40}(\x27)`, 'g');
  if (simpleRegex.test(content)) {
    return content.replace(simpleRegex, `$1${address}$2`);
  }

  const ternaryRegex = new RegExp(
    `(${fieldName}:[\\s\\S]*?:\\s*\x27)0x[a-fA-F0-9]{40}(\x27\\s*\\)\\s*as\\s*\`0x\\$\\{string\\}\`)`,
    'g',
  );
  if (ternaryRegex.test(content)) {
    return content.replace(ternaryRegex, `$1${address}$2`);
  }

  return content;
}

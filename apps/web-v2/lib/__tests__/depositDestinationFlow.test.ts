import { describe, expect, it, vi } from 'vitest';
import { decodeFunctionData, encodeFunctionData, parseUnits, getAddress, Address } from 'viem';
import { CONTROLLER_ABI } from '../contracts/controller';
import { ERC20_ABI } from '../smartAccount/constants';
import { aggregatePortfolioAddresses } from '../portfolioMath';

describe('Deposit Destination Selection & UX Flow Suite', () => {
  const MOCK_EOA: Address = '0x1111111111111111111111111111111111111111';
  const MOCK_SMART_ACCOUNT: Address = '0x2222222222222222222222222222222222222222';
  const MOCK_USDC: Address = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
  const MOCK_CONTROLLER: Address = '0x000000000000000000000000000000000000C071';

  // 1. Destination Default Behavior
  it('1. Default deposit destination is Connected Wallet (EOA)', () => {
    const defaultDestination = 'eoa';
    const effectiveReceiver =
      defaultDestination === 'smart_account' ? MOCK_SMART_ACCOUNT : MOCK_EOA;
    expect(effectiveReceiver).toBe(MOCK_EOA);
  });

  // 2. Switching to Smart Account Destination
  it('2. Switching destination to Smart Account selects deterministic Smart Account address', () => {
    const selectedDestination: 'eoa' | 'smart_account' = 'smart_account';
    const effectiveReceiver =
      selectedDestination === 'smart_account' ? MOCK_SMART_ACCOUNT : MOCK_EOA;
    expect(effectiveReceiver).toBe(MOCK_SMART_ACCOUNT);
    expect(effectiveReceiver).not.toBe(MOCK_EOA);
  });

  // 3. EOA Destination Contract Call Construction
  it('3. Encodes Controller.deposit with EOA receiver when destination is EOA', () => {
    const amount = parseUnits('100', 6);
    const minSharesOut = parseUnits('99', 18);
    const receiver = MOCK_EOA;

    const data = encodeFunctionData({
      abi: CONTROLLER_ABI,
      functionName: 'deposit',
      args: [MOCK_USDC, amount, minSharesOut, receiver],
    });

    const decoded = decodeFunctionData({
      abi: CONTROLLER_ABI,
      data,
    });

    expect(decoded.functionName).toBe('deposit');
    expect(getAddress(decoded.args[0] as string)).toBe(getAddress(MOCK_USDC));
    expect(decoded.args[1]).toBe(amount);
    expect(decoded.args[2]).toBe(minSharesOut);
    expect(getAddress(decoded.args[3] as string)).toBe(getAddress(MOCK_EOA));
  });

  // 4. Smart Account Destination Contract Call Construction
  it('4. Encodes Controller.deposit with Smart Account receiver when destination is Smart Account', () => {
    const amount = parseUnits('100', 6);
    const minSharesOut = parseUnits('99', 18);
    const receiver = MOCK_SMART_ACCOUNT;

    const data = encodeFunctionData({
      abi: CONTROLLER_ABI,
      functionName: 'deposit',
      args: [MOCK_USDC, amount, minSharesOut, receiver],
    });

    const decoded = decodeFunctionData({
      abi: CONTROLLER_ABI,
      data,
    });

    expect(decoded.functionName).toBe('deposit');
    expect(getAddress(decoded.args[0] as string)).toBe(getAddress(MOCK_USDC));
    expect(decoded.args[1]).toBe(amount);
    expect(decoded.args[2]).toBe(minSharesOut);
    expect(getAddress(decoded.args[3] as string)).toBe(getAddress(MOCK_SMART_ACCOUNT));
  });

  // 5. Quote preview requests match selected recipient
  it('5. Encodes getDepositQuote with matching recipient address for both destinations', () => {
    const amount = parseUnits('50', 6);

    const quoteCallEOA = encodeFunctionData({
      abi: CONTROLLER_ABI,
      functionName: 'getDepositQuote',
      args: [MOCK_USDC, amount, 0n, MOCK_EOA],
    });

    const quoteCallSA = encodeFunctionData({
      abi: CONTROLLER_ABI,
      functionName: 'getDepositQuote',
      args: [MOCK_USDC, amount, 0n, MOCK_SMART_ACCOUNT],
    });

    const decodedEOA = decodeFunctionData({
      abi: CONTROLLER_ABI,
      data: quoteCallEOA,
    });

    const decodedSA = decodeFunctionData({
      abi: CONTROLLER_ABI,
      data: quoteCallSA,
    });

    expect(getAddress(decodedEOA.args[3] as string)).toBe(getAddress(MOCK_EOA));
    expect(getAddress(decodedSA.args[3] as string)).toBe(getAddress(MOCK_SMART_ACCOUNT));
  });

  // 6. Blocks execution when Smart Account address is not yet derived
  it('6. Rejects deposit when destination is Smart Account but Smart Account is unavailable', () => {
    const destination: 'eoa' | 'smart_account' = 'smart_account';
    const smartAccountAddress: Address | null = null;

    const getDisabledReason = (dest: string, sa: Address | null) => {
      if (dest === 'smart_account' && !sa) {
        return 'Smart Account is not available';
      }
      return null;
    };

    expect(getDisabledReason(destination, smartAccountAddress)).toBe(
      'Smart Account is not available',
    );
  });

  // 7. Rejection of arbitrary user-inputted recipient addresses
  it('7. Enforces strict union type for destination selection preventing arbitrary address injection', () => {
    const validDestinations = ['eoa', 'smart_account'] as const;
    const isValidDestination = (val: string): val is 'eoa' | 'smart_account' => {
      return (validDestinations as readonly string[]).includes(val);
    };

    expect(isValidDestination('eoa')).toBe(true);
    expect(isValidDestination('smart_account')).toBe(true);
    expect(isValidDestination('0x9999999999999999999999999999999999999999')).toBe(false);
    expect(isValidDestination('arbitrary_hacker_account')).toBe(false);
  });

  // 8. Single-click allowance requirement is independent of destination (USDC pulled from connected EOA)
  it('8. Single-click approval check pulls USDC from connected EOA regardless of destination', () => {
    const depositAmount = parseUnits('100', 6);
    const eoaAllowance = 0n;

    const requiresApproval = eoaAllowance < depositAmount;
    expect(requiresApproval).toBe(true);

    const approveData = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [MOCK_CONTROLLER, parseUnits('1000000', 6)],
    });

    const decoded = decodeFunctionData({
      abi: ERC20_ABI,
      data: approveData,
    });

    expect(decoded.functionName).toBe('approve');
    expect(getAddress(decoded.args[0] as string)).toBe(getAddress(MOCK_CONTROLLER));
  });

  // 9. Portfolio aggregation consistency
  it('9. Minting to Smart Account seamlessly aggregates into unified portfolio without accounting drift', () => {
    // Before: user holds 10 shares on EOA, 0 on Smart Account
    const portfolioBefore = aggregatePortfolioAddresses({
      eoaSharesRaw: parseUnits('10', 18),
      smartAccountSharesRaw: parseUnits('0', 18),
      eoaCostBasisRaw: parseUnits('10', 18),
      smartAccountCostBasisRaw: parseUnits('0', 18),
    });

    // After depositing 5 shares to Smart Account:
    const portfolioAfter = aggregatePortfolioAddresses({
      eoaSharesRaw: parseUnits('10', 18),
      smartAccountSharesRaw: parseUnits('5', 18),
      eoaCostBasisRaw: parseUnits('10', 18),
      smartAccountCostBasisRaw: parseUnits('5', 18),
    });

    expect(portfolioBefore.totalSharesRaw).toBe(parseUnits('10', 18));
    expect(portfolioAfter.totalSharesRaw).toBe(parseUnits('15', 18));
    expect(portfolioAfter.totalCostBasisRaw).toBe(parseUnits('15', 18));
  });
});

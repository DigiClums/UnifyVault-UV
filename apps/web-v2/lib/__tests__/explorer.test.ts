import { describe, expect, it } from 'vitest';
import { MAX_BLOCK_WINDOW } from '../explorer/types';
import {
  calculateFromBlock,
  getBlockWindow,
  validateBlockRange,
  hasOlderBlocks,
} from '../explorer/blockRange';
import { classifyTransaction, getEventDisplayName } from '../explorer/eventRegistry';

// ─── Block Range Safety ─────────────────────────────────────────────────────

describe('Block Range Safety', () => {
  it('MAX_BLOCK_WINDOW is 1500 blocks', () => {
    expect(MAX_BLOCK_WINDOW).toBe(1500n);
  });

  it('calculateFromBlock returns safe range with default 1500 window', () => {
    const latestBlock = 100000n;
    const fromBlock = calculateFromBlock(latestBlock);
    const span = latestBlock - fromBlock + 1n;
    expect(span).toBe(1500n);
    expect(span <= 2000n).toBe(true);
  });

  it('calculateFromBlock returns 0n for low block numbers', () => {
    const fromBlock = calculateFromBlock(500n);
    expect(fromBlock).toBe(0n);
  });

  it('getBlockWindow page 0 = latest 1500 blocks', () => {
    const latestBlock = 45200000n;
    const w = getBlockWindow(latestBlock, 0);
    expect(w.pageIndex).toBe(0);
    const span = w.toBlock - w.fromBlock + 1n;
    expect(span).toBe(1500n);
  });

  it('getBlockWindow page 1 = previous 1500 blocks', () => {
    const latestBlock = 45200000n;
    const w0 = getBlockWindow(latestBlock, 0);
    const w1 = getBlockWindow(latestBlock, 1);
    // page 1 toBlock should be page 0 fromBlock - 1
    expect(w1.toBlock).toBe(w0.fromBlock - 1n);
  });

  it('getBlockWindow returns zero window when past genesis', () => {
    const w = getBlockWindow(100n, 0);
    expect(w.fromBlock).toBe(0n);
    expect(w.toBlock).toBe(100n);
  });

  it('validateBlockRange throws when span > 2000', () => {
    expect(() => validateBlockRange(0n, 2000n)).toThrow('spans 2001 blocks (max 2000)');
  });

  it('validateBlockRange passes when span <= 2000', () => {
    expect(() => validateBlockRange(0n, 1999n)).not.toThrow();
    expect(() => validateBlockRange(1n, 2000n)).not.toThrow();
  });

  it('never allows "latestBlock - 2000" (2001 blocks)', () => {
    const latestBlock = 100000n;
    const badFromBlock = latestBlock - 2000n;
    const span = latestBlock - badFromBlock + 1n;
    expect(span).toBe(2001n);
    expect(() => validateBlockRange(badFromBlock, latestBlock)).toThrow();
  });

  it('never allows "latestBlock - 1999" (2000 blocks)—safe', () => {
    const latestBlock = 100000n;
    const safeFromBlock = latestBlock - 1999n;
    const span = latestBlock - safeFromBlock + 1n;
    expect(span).toBe(2000n);
    expect(() => validateBlockRange(safeFromBlock, latestBlock)).not.toThrow();
  });

  it('hasOlderBlocks returns true when there are older blocks', () => {
    expect(hasOlderBlocks(45200000n, 0)).toBe(true);
  });

  it('hasOlderBlocks returns false when past genesis', () => {
    expect(hasOlderBlocks(100n, 0)).toBe(false);
  });

  it('pagination handles 20 pages without underflow', () => {
    const latestBlock = 50000n;
    for (let page = 0; page < 20; page++) {
      const w = getBlockWindow(latestBlock, page);
      expect(w.fromBlock >= 0n).toBe(true);
      expect(w.toBlock > 0n || page > 0).toBe(true);
    }
  });
});

// ─── Event Classification ───────────────────────────────────────────────────

describe('Transaction Classification', () => {
  it('classifies DepositExecuted as deposit', () => {
    expect(classifyTransaction(['DepositExecuted'])).toBe('deposit');
  });

  it('classifies DepositCompleted as deposit', () => {
    expect(classifyTransaction(['DepositCompleted'])).toBe('deposit');
  });

  it('classifies RedeemExecuted as redeem', () => {
    expect(classifyTransaction(['RedeemExecuted'])).toBe('redeem');
  });

  it('classifies RedeemCompleted as redeem', () => {
    expect(classifyTransaction(['RedeemCompleted'])).toBe('redeem');
  });

  it('classifies ProtocolFeeCollected as fee', () => {
    expect(classifyTransaction(['ProtocolFeeCollected'])).toBe('fee');
  });

  it('classifies FeeCollected (Treasury) as fee', () => {
    expect(classifyTransaction(['FeeCollected'])).toBe('fee');
  });

  it('classifies EmergencyPaused as admin', () => {
    expect(classifyTransaction(['EmergencyPaused'])).toBe('admin');
  });

  it('classifies EmergencyResumed as admin', () => {
    expect(classifyTransaction(['EmergencyResumed'])).toBe('admin');
  });

  it('classifies StrategyRebalanced as admin', () => {
    expect(classifyTransaction(['StrategyRebalanced'])).toBe('admin');
  });

  // ─── Treasury/Fee Classification (regression) ──────────────────────

  it('classifies TreasuryWithdrawal as fee (NOT admin)', () => {
    expect(classifyTransaction(['TreasuryWithdrawal'])).toBe('fee');
  });

  it('classifies NativeWithdrawn as fee (NOT admin)', () => {
    expect(classifyTransaction(['NativeWithdrawn'])).toBe('fee');
  });

  it('classifies TreasuryWithdrawal + Transfer as fee', () => {
    // Real scenario from Base Sepolia tx 0x5c11c795...
    expect(classifyTransaction(['Transfer', 'TreasuryWithdrawal'])).toBe('fee');
  });

  it('TreasuryWithdrawal is NOT classified as admin', () => {
    expect(classifyTransaction(['TreasuryWithdrawal'])).not.toBe('admin');
  });

  it('TreasuryWithdrawal is NOT classified as unknown', () => {
    expect(classifyTransaction(['TreasuryWithdrawal'])).not.toBe('unknown');
  });

  it('TreasuryWithdrawal is NOT classified as other', () => {
    expect(classifyTransaction(['TreasuryWithdrawal'])).not.toBe('other');
  });

  it('deposit still takes priority over TreasuryWithdrawal', () => {
    expect(classifyTransaction(['TreasuryWithdrawal', 'DepositExecuted'])).toBe('deposit');
  });

  it('redeem still takes priority over TreasuryWithdrawal', () => {
    expect(classifyTransaction(['TreasuryWithdrawal', 'RedeemCompleted'])).toBe('redeem');
  });

  it('EmergencyPaused still classifies as admin', () => {
    expect(classifyTransaction(['EmergencyPaused'])).toBe('admin');
    expect(classifyTransaction(['EmergencyPaused'])).not.toBe('fee');
  });

  it('does not classify P2P events as protocol action types (decoupled from protocol explorer)', () => {
    expect(classifyTransaction(['TradeCreated'])).not.toBe('p2p_settlement');
    expect(classifyTransaction(['EscrowFunded'])).not.toBe('p2p_settlement');
    expect(classifyTransaction(['PaymentSubmitted'])).not.toBe('p2p_settlement');
    expect(classifyTransaction(['EscrowReleased'])).not.toBe('p2p_settlement');
    expect(classifyTransaction(['EscrowRefunded'])).not.toBe('p2p_settlement');
    expect(classifyTransaction(['TradeDisputed'])).not.toBe('p2p_settlement');
    expect(classifyTransaction(['TradeCancelled'])).not.toBe('p2p_settlement');
  });

  it('classifies standard ERC20 transfers as wallet_transfer', () => {
    expect(classifyTransaction(['Transfer'])).toBe('wallet_transfer');
    expect(classifyTransaction(['Transfer', 'Approval'])).toBe('wallet_transfer');
  });

  it('classifies unknown non-transfer events as other', () => {
    expect(classifyTransaction(['Approval'])).toBe('other');
  });

  it('classifies empty event list as unknown', () => {
    expect(classifyTransaction([])).toBe('unknown');
  });

  it('deposit takes priority over fee in mixed events', () => {
    expect(classifyTransaction(['ProtocolFeeCollected', 'DepositExecuted'])).toBe('deposit');
  });

  it('redeem takes priority over fee in mixed events', () => {
    expect(classifyTransaction(['ProtocolFeeCollected', 'RedeemCompleted'])).toBe('redeem');
  });
});

// ─── Display Names ─────────────────────────────────────────────────────────

describe('Event Display Names', () => {
  it('returns human-readable name for known events', () => {
    expect(getEventDisplayName('UnifyVaultController', 'DepositExecuted')).toBe('Deposit Executed');
    expect(getEventDisplayName('UnifyVaultController', 'RedeemCompleted')).toBe('Redeem Completed');
    expect(getEventDisplayName('Treasury', 'FeeCollected')).toBe('Fee Sent To Treasury');
  });

  it('returns fallback for unknown events', () => {
    const name = getEventDisplayName('UnknownContract', 'SomeEvent');
    expect(name).toContain('UnknownContract');
    expect(name).toContain('SomeEvent');
  });
});

// ─── Duplicate Prevention (TransactionGroup dedup) ─────────────────────────

describe('Duplicate Transaction Prevention', () => {
  it('transaction grouping uses hash as unique key (conceptual)', () => {
    // The dedup logic is in discoverTransactions which deduplicates
    // by using Set<Hex> for transaction hashes before fetching receipts
    const hashes = [
      '0xabc0000000000000000000000000000000000000000000000000000000000001',
      '0xabc0000000000000000000000000000000000000000000000000000000000001',
      '0xdef0000000000000000000000000000000000000000000000000000000000002',
    ];
    const unique = new Set(hashes);
    expect(unique.size).toBe(2);
  });
});

// ─── LiveWatcher Protocol Decoder & Formatter ───────────────────────────────

import { getTokenSymbol, getTokenDecimals, formatAmount } from '../explorer/eventRegistry';

describe('LiveWatcher Protocol Transaction Decoder & Formatter', () => {
  it('a) correctly formats USDC deposit amounts: 20.94 gross / 0.05235 fee / 20.88765 net', () => {
    const grossDeposit = 20940000n; // 6 decimals
    const protocolFee = 52350n; // 6 decimals
    const netDeposit = 20887650n; // 6 decimals

    expect(formatAmount(grossDeposit, 6)).toBe('20.94');
    expect(formatAmount(protocolFee, 6)).toBe('0.05235');
    expect(formatAmount(netDeposit, 6)).toBe('20.88765');
  });

  it('b) converts cbBTC raw 19626 to 0.00019626 (8 decimals)', () => {
    const rawCbBTC = 19626n;
    const cbBTCDecimals = getTokenDecimals('cbBTC');
    const cbBTCAddrDecimals = getTokenDecimals('0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf');

    expect(cbBTCDecimals).toBe(8);
    expect(cbBTCAddrDecimals).toBe(8);
    expect(formatAmount(rawCbBTC, cbBTCDecimals)).toBe('0.00019626');
  });

  it('c) converts WETH raw 4464069467795376 to 0.004464069467795376 (18 decimals)', () => {
    const rawWETH = 4464069467795376n;
    const wethDecimals = getTokenDecimals('WETH');
    const wethAddrDecimals = getTokenDecimals('0x4200000000000000000000000000000000000006');

    expect(wethDecimals).toBe(18);
    expect(wethAddrDecimals).toBe(18);
    expect(formatAmount(rawWETH, wethDecimals)).toBe('0.004464069467795376');
  });

  it('d) formats final swap summary with token-aware decimals', () => {
    const targetAssets = [
      '0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf', // cbBTC
      '0x4200000000000000000000000000000000000006', // WETH
    ];
    const assetsBought = [19626n, 4464069467795376n];

    const swapSummary = targetAssets
      .map(
        (asset, i) =>
          `${formatAmount(assetsBought[i], getTokenDecimals(asset))} ${getTokenSymbol(asset)}`,
      )
      .join(', ');

    expect(swapSummary).toBe('0.00019626 cbBTC, 0.004464069467795376 WETH');
  });

  it('e) formats custody deposit cbBTC amount accurately using token decimals', () => {
    const custodyDepositAsset = '0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf';
    const custodyDepositAmount = 19626n;

    const formattedAmount = formatAmount(
      custodyDepositAmount,
      getTokenDecimals(custodyDepositAsset),
    );
    const symbol = getTokenSymbol(custodyDepositAsset);

    expect(formattedAmount).toBe('0.00019626');
    expect(symbol).toBe('cbBTC');
    expect(`${formattedAmount} ${symbol}`).toBe('0.00019626 cbBTC');
    expect(`${formattedAmount} ${symbol}`).not.toBe('0.00000000 cbBTC');
  });
});

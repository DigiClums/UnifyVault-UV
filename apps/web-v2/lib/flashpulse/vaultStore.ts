// Serverless / In-Memory & Encrypted Session State for FlashPulse Gasless Vault
export interface UserVaultBalance {
  address: string;
  depositedUVBE: number;
  lockedUVBE: number;
  availableUVBE: number;
  lastUpdated: number;
}

export interface StoredRound {
  id: number;
  asset: 'BTC' | 'ETH';
  startTime: number;
  lockTime: number;
  endTime: number;
  strikePrice: number;
  closePrice: number;
  upPoolUVBE: number;
  downPoolUVBE: number;
  totalPoolUVBE: number;
  winningDirection: 'UP' | 'DOWN' | 'DRAW' | null;
  bets: {
    address: string;
    direction: 'UP' | 'DOWN';
    amountUVBE: number;
    timestamp: number;
  }[];
}

class FlashPulseVaultStore {
  private userBalances = new Map<string, UserVaultBalance>();
  private activeRounds = new Map<number, StoredRound>();
  private roundCounter = 1000;

  constructor() {
    // Demo seed balance for connected users
    this.userBalances.set('0x441dbf8076d0b143ec17199bae94daa884161454', {
      address: '0x441dbf8076d0b143ec17199bae94daa884161454',
      depositedUVBE: 500.0,
      lockedUVBE: 0,
      availableUVBE: 500.0,
      lastUpdated: Date.now(),
    });
  }

  getBalance(address: string): UserVaultBalance {
    const clean = address.toLowerCase();
    if (!this.userBalances.has(clean)) {
      this.userBalances.set(clean, {
        address: clean,
        depositedUVBE: 100.0, // Initial game faucet bonus
        lockedUVBE: 0,
        availableUVBE: 100.0,
        lastUpdated: Date.now(),
      });
    }
    return this.userBalances.get(clean)!;
  }

  deposit(address: string, amountUVBE: number): UserVaultBalance {
    const bal = this.getBalance(address);
    bal.depositedUVBE += amountUVBE;
    bal.availableUVBE += amountUVBE;
    bal.lastUpdated = Date.now();
    this.userBalances.set(address.toLowerCase(), bal);
    return bal;
  }

  withdraw(address: string, amountUVBE: number): { success: boolean; balance?: UserVaultBalance; error?: string } {
    const bal = this.getBalance(address);
    if (bal.availableUVBE < amountUVBE) {
      return { success: false, error: 'Insufficient available UVBE in vault' };
    }
    bal.depositedUVBE -= amountUVBE;
    bal.availableUVBE -= amountUVBE;
    bal.lastUpdated = Date.now();
    this.userBalances.set(address.toLowerCase(), bal);
    return { success: true, balance: bal };
  }

  lockBet(address: string, amountUVBE: number): boolean {
    const bal = this.getBalance(address);
    if (bal.availableUVBE < amountUVBE) return false;
    bal.availableUVBE -= amountUVBE;
    bal.lockedUVBE += amountUVBE;
    bal.lastUpdated = Date.now();
    return true;
  }

  creditWin(address: string, betAmountUVBE: number, payoutUVBE: number): UserVaultBalance {
    const bal = this.getBalance(address);
    bal.lockedUVBE = Math.max(0, bal.lockedUVBE - betAmountUVBE);
    bal.availableUVBE += payoutUVBE;
    bal.depositedUVBE += (payoutUVBE - betAmountUVBE);
    bal.lastUpdated = Date.now();
    return bal;
  }

  debitLoss(address: string, betAmountUVBE: number): UserVaultBalance {
    const bal = this.getBalance(address);
    bal.lockedUVBE = Math.max(0, bal.lockedUVBE - betAmountUVBE);
    bal.depositedUVBE = Math.max(0, bal.depositedUVBE - betAmountUVBE);
    bal.lastUpdated = Date.now();
    return bal;
  }
}

// Global Singleton in Node runtime
const globalForVault = globalThis as unknown as { flashPulseVault?: FlashPulseVaultStore };
export const vaultStore = globalForVault.flashPulseVault || new FlashPulseVaultStore();
if (process.env.NODE_ENV !== 'production') globalForVault.flashPulseVault = vaultStore;

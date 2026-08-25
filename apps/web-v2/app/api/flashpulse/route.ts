import { NextResponse } from 'next/server';
import { vaultStore } from '../../../lib/flashpulse/vaultStore';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: 'Address required' }, { status: 400 });
  }

  const balance = vaultStore.getBalance(address);
  return NextResponse.json({ balance });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, address, amountUVBE, direction } = body;

    if (!address) {
      return NextResponse.json({ error: 'Address required' }, { status: 400 });
    }

    if (action === 'DEPOSIT') {
      const bal = vaultStore.deposit(address, Number(amountUVBE));
      return NextResponse.json({ success: true, balance: bal });
    }

    if (action === 'WITHDRAW') {
      const res = vaultStore.withdraw(address, Number(amountUVBE));
      if (!res.success) {
        return NextResponse.json({ error: res.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, balance: res.balance });
    }

    if (action === 'LOCK_BET') {
      const ok = vaultStore.lockBet(address, Number(amountUVBE));
      if (!ok) {
        return NextResponse.json({ error: 'Insufficient vault balance' }, { status: 400 });
      }
      const bal = vaultStore.getBalance(address);
      return NextResponse.json({ success: true, balance: bal });
    }

    if (action === 'SETTLE_WIN') {
      const { betAmountUVBE, payoutUVBE } = body;
      const bal = vaultStore.creditWin(address, Number(betAmountUVBE), Number(payoutUVBE));
      return NextResponse.json({ success: true, balance: bal });
    }

    if (action === 'SETTLE_LOSS') {
      const { betAmountUVBE } = body;
      const bal = vaultStore.debitLoss(address, Number(betAmountUVBE));
      return NextResponse.json({ success: true, balance: bal });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

'use client';

import { useTransactionStore } from '../../store/useTransactionStore';

export function TransactionModal() {
  const { isOpen, step, txHash, errorMessage, closeModal, reset, actionType } =
    useTransactionStore();

  if (!isOpen) return null;

  const getTitle = () => {
    switch (actionType) {
      case 'APPROVE':
        return 'Token Approval';
      case 'DEPOSIT':
        return 'Deposit Processing';
      case 'REDEEM':
        return 'Redemption Processing';
      default:
        return 'Transaction Processing';
    }
  };

  const getConfirmedMessage = () => {
    switch (actionType) {
      case 'APPROVE':
        return 'Approval completed successfully!';
      case 'DEPOSIT':
        return 'Collateral deployed successfully!';
      case 'REDEEM':
        return 'Redemption completed successfully!';
      default:
        return 'Transaction completed successfully!';
    }
  };

  const getFailedTitle = () => {
    switch (actionType) {
      case 'APPROVE':
        return 'Approval Failed';
      case 'DEPOSIT':
        return 'Deposit Failed';
      case 'REDEEM':
        return 'Redemption Failed';
      default:
        return 'Transaction Failed';
    }
  };

  // Step Progress Index (0 to 4)
  const getCurrentStepIndex = () => {
    if (step === 'APPROVING') return 0;
    if (step === 'EXECUTING') return 1;
    if (step === 'CONFIRMED') return 4;
    if (step === 'FAILED') return 1;
    return 0;
  };

  const currentIdx = getCurrentStepIndex();

  const isDeposit = actionType === 'DEPOSIT';
  const progressSteps = isDeposit
    ? [
        { label: 'Wallet Approval', desc: 'Approve USDC spend limit' },
        { label: 'Deposit Collateral', desc: 'Transfer USDC to vault' },
        { label: 'Swap Strategy Assets', desc: 'Allocate to BTC & ETH' },
        { label: 'Mint Shares', desc: 'Issue UVBTCETH shares' },
      ]
    : [
        { label: 'Wallet Approval', desc: 'Approve UVBTCETH spend limit' },
        { label: 'Burn UV Shares', desc: 'Burn index shares' },
        { label: 'Swap Strategy Assets', desc: 'Liquidate underlying assets' },
        { label: 'Performance Fee Settlement', desc: 'Settle 5.0% fee on profit' },
      ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl text-foreground">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
          <h3 className="text-xl font-bold text-foreground">{getTitle()}</h3>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-mono">
            {step === 'CONFIRMED' ? 'Success' : step === 'FAILED' ? 'Failed' : 'In Progress'}
          </span>
        </div>

        {/* Multi-Step Transaction Progress Stepper */}
        <div className="mb-6 space-y-3">
          {progressSteps.map((s, idx) => {
            const isDone = currentIdx > idx || step === 'CONFIRMED';
            const isCurrent = currentIdx === idx && step !== 'CONFIRMED' && step !== 'FAILED';
            const isFailed = step === 'FAILED' && currentIdx === idx;

            return (
              <div
                key={s.label}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                  isDone
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-foreground'
                    : isCurrent
                      ? 'bg-primary/10 border-primary/40 text-foreground shadow-sm'
                      : isFailed
                        ? 'bg-rose-500/10 border-rose-500/30 text-foreground'
                        : 'bg-muted/30 border-border/60 text-muted-foreground opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold font-mono ${
                      isDone
                        ? 'bg-emerald-500 text-white'
                        : isCurrent
                          ? 'bg-primary text-primary-foreground animate-pulse'
                          : isFailed
                            ? 'bg-rose-500 text-white'
                            : 'bg-muted border border-border text-muted-foreground'
                    }`}
                  >
                    {isDone ? '✓' : isFailed ? '✕' : idx + 1}
                  </div>
                  <div>
                    <p className="text-xs font-bold">{s.label}</p>
                    <p className="text-[11px] text-muted-foreground">{s.desc}</p>
                  </div>
                </div>

                {isCurrent && (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                )}
              </div>
            );
          })}
        </div>

        {step === 'PREPARING' && (
          <div className="flex flex-col items-center py-4 text-center">
            <p className="text-foreground font-medium text-sm">Preparing Transaction Quote...</p>
          </div>
        )}

        {step === 'APPROVING' && (
          <div className="flex flex-col items-center py-2 text-center">
            <p className="text-xs text-muted-foreground">
              Please confirm the spend limit in your Web3 wallet
            </p>
          </div>
        )}

        {step === 'EXECUTING' && (
          <div className="flex flex-col items-center py-2 text-center font-medium">
            <p className="text-sm font-semibold text-foreground">
              {actionType === 'DEPOSIT'
                ? 'Confirming Deposit Transaction...'
                : actionType === 'REDEEM'
                  ? 'Burning shares...'
                  : actionType === 'APPROVE'
                    ? 'Confirming Approval Transaction...'
                    : 'Executing Transaction...'}
            </p>
          </div>
        )}

        {step === 'CONFIRMED' && (
          <div className="flex flex-col items-center pt-2 text-center">
            <p className="text-emerald-600 dark:text-emerald-400 font-bold text-base mb-1">
              {getConfirmedMessage()}
            </p>
            {txHash && (
              <a
                href={`https://basescan.org/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary hover:underline break-all mt-1"
              >
                View on Basescan: {txHash.slice(0, 10)}...{txHash.slice(-8)}
              </a>
            )}
            <button
              onClick={reset}
              className="mt-4 w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Done
            </button>
          </div>
        )}

        {step === 'FAILED' && (
          <div className="flex flex-col items-center pt-2 text-center">
            <p className="text-rose-600 dark:text-rose-400 font-bold text-base mb-1">
              {getFailedTitle()}
            </p>
            <p className="text-xs text-muted-foreground mt-2 bg-muted p-3 rounded-lg w-full text-left font-mono border border-border">
              {errorMessage || 'Transaction was rejected or reverted.'}
            </p>
            <button
              onClick={closeModal}
              className="mt-4 w-full rounded-xl bg-secondary py-3 font-semibold text-foreground hover:bg-accent transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

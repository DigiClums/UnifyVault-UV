'use client';

import { useTransactionStore } from '../../store/useTransactionStore';

export function TransactionModal() {
  const { isOpen, step, txHash, errorMessage, closeModal, reset, actionType } =
    useTransactionStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-[#111827] p-6 shadow-2xl">
        <h3 className="text-xl font-bold text-white mb-4">
          {actionType === 'DEPOSIT' ? 'Deposit Processing' : 'Redemption Processing'}
        </h3>

        {step === 'PREPARING' && (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mb-4" />
            <p className="text-gray-300 font-medium">Preparing Transaction Quote...</p>
          </div>
        )}

        {step === 'APPROVING' && (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent mb-4" />
            <p className="text-gray-300 font-medium">Awaiting Signature in Wallet...</p>
            <p className="text-xs text-gray-400 mt-2">
              Please confirm the approval in your Web3 wallet
            </p>
          </div>
        )}

        {step === 'EXECUTING' && (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mb-4" />
            <p className="text-gray-300 font-medium">Submitting Transaction...</p>
          </div>
        )}

        {step === 'CONFIRMED' && (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="h-12 w-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl font-bold mb-4">
              ✓
            </div>
            <p className="text-emerald-400 font-bold text-lg mb-1">Transaction Confirmed!</p>
            {txHash && (
              <a
                href={`https://basescan.org/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-400 hover:underline break-all mt-2"
              >
                View on Basescan: {txHash.slice(0, 10)}...{txHash.slice(-8)}
              </a>
            )}
            <button
              onClick={reset}
              className="mt-6 w-full rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-500 transition-colors"
            >
              Done
            </button>
          </div>
        )}

        {step === 'FAILED' && (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="h-12 w-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-2xl font-bold mb-4">
              ✕
            </div>
            <p className="text-rose-400 font-bold text-lg mb-1">Transaction Failed</p>
            <p className="text-xs text-gray-400 mt-2 bg-gray-900 p-3 rounded-lg w-full text-left font-mono">
              {errorMessage || 'Transaction was rejected or reverted.'}
            </p>
            <button
              onClick={closeModal}
              className="mt-6 w-full rounded-xl bg-gray-800 py-3 font-semibold text-gray-300 hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

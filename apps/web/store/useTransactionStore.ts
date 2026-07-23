import { create } from 'zustand';

export type TxStep = 'IDLE' | 'PREPARING' | 'APPROVING' | 'EXECUTING' | 'CONFIRMED' | 'FAILED';

interface TransactionState {
  isOpen: boolean;
  step: TxStep;
  txHash?: `0x${string}`;
  errorMessage?: string;
  actionType?: 'DEPOSIT' | 'REDEEM' | 'APPROVE';
  openModal: (actionType: 'DEPOSIT' | 'REDEEM' | 'APPROVE') => void;
  closeModal: () => void;
  setStep: (step: TxStep) => void;
  setTxHash: (hash: `0x${string}`) => void;
  setError: (msg: string) => void;
  reset: () => void;
}

export const useTransactionStore = create<TransactionState>((set) => ({
  isOpen: false,
  step: 'IDLE',
  txHash: undefined,
  errorMessage: undefined,
  actionType: undefined,
  openModal: (actionType) =>
    set({
      isOpen: true,
      step: 'PREPARING',
      actionType,
      errorMessage: undefined,
      txHash: undefined,
    }),
  closeModal: () => set({ isOpen: false }),
  setStep: (step) => set({ step }),
  setTxHash: (txHash) => set({ txHash, step: 'CONFIRMED' }),
  setError: (errorMessage) => set({ errorMessage, step: 'FAILED' }),
  reset: () =>
    set({
      isOpen: false,
      step: 'IDLE',
      txHash: undefined,
      errorMessage: undefined,
      actionType: undefined,
    }),
}));

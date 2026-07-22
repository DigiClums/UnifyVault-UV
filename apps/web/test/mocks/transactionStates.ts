export const mockPendingTxState = {
  hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as const,
  isPending: true,
  isSuccess: false,
  isError: false,
  error: null,
};

export const mockSuccessTxState = {
  hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as const,
  isPending: false,
  isSuccess: true,
  isError: false,
  error: null,
  receipt: {
    status: 'success' as const,
    transactionHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    blockNumber: 123456n,
  },
};

export const mockFailedTxState = {
  hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as const,
  isPending: false,
  isSuccess: false,
  isError: true,
  error: new Error('User rejected the transaction'),
};

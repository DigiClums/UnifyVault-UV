import { Address, Hex } from 'viem';

export interface SmartAccountCall {
  to: Address;
  value?: bigint;
  data: Hex;
}

export interface GaslessDepositParams {
  amount: bigint;
  minSharesOut: bigint;
  receiver: Address;
  usdcAddress?: Address;
  controllerAddress?: Address;
}

export interface GaslessRedeemParams {
  shares: bigint;
  minAssetsOut: bigint;
  receiver: Address;
  deadline?: bigint;
  usdcAddress?: Address;
  controllerAddress?: Address;
}

export interface P2PCreateTradeParams {
  buyer: Address;
  seller: Address;
  asset: Address;
  amount: bigint;
  fiatAmount: bigint;
  fiatCurrency: Hex;
  paymentWindow: bigint;
  escrowAddress?: Address;
}

export interface P2PFundTradeParams {
  tradeId: bigint;
  amount: bigint;
  assetAddress: Address;
  escrowAddress?: Address;
}

export interface P2PSubmitPaymentParams {
  tradeId: bigint;
  paymentReference: Hex;
  evidenceHash: Hex;
  escrowAddress?: Address;
}

export interface P2PConfirmReleaseParams {
  tradeId: bigint;
  escrowAddress?: Address;
}

export interface P2PRefundParams {
  tradeId: bigint;
  escrowAddress?: Address;
}

export interface P2PCancelUnfundedParams {
  tradeId: bigint;
  escrowAddress?: Address;
}

export interface P2PRaiseDisputeParams {
  tradeId: bigint;
  reasonHash: Hex;
  escrowAddress?: Address;
}

export interface SponsorshipValidationRequest {
  chainId: number;
  entryPoint: Address;
  sender: Address;
  calls: SmartAccountCall[];
}

export interface SponsorshipValidationResult {
  isApproved: boolean;
  reason?: string;
  operationType?:
    | 'deposit'
    | 'redeem'
    | 'batch_deposit'
    | 'transfer'
    | 'p2p_create'
    | 'p2p_fund'
    | 'p2p_batch_fund'
    | 'p2p_submit_payment'
    | 'p2p_release'
    | 'p2p_refund'
    | 'p2p_cancel'
    | 'p2p_dispute';
}

export interface SmartAccountState {
  address: Address | null;
  ownerAddress: Address | null;
  isDeployed: boolean;
  isLoading: boolean;
  error: string | null;
}

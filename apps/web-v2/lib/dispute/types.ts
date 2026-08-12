export type DisputeSenderRole = 'BUYER' | 'SELLER' | 'ADMIN' | 'SYSTEM';

export type AdminDisputeAction =
  | 'OPEN_DISPUTE'
  | 'REQUEST_EVIDENCE'
  | 'REVIEW_EVIDENCE'
  | 'SEND_MESSAGE'
  | 'MARK_BUYER_FAVOURED'
  | 'MARK_SELLER_FAVOURED'
  | 'REQUEST_SELLER_RELEASE'
  | 'REQUEST_REFUND'
  | 'CLOSE_DISPUTE';

export interface DisputeMessage {
  messageId: string;
  tradeId: number;
  disputeId: string;
  senderAddress: string;
  senderRole: DisputeSenderRole;
  content: string;
  evidenceHash?: string;
  evidenceUrl?: string;
  timestamp: string;
}

export interface AdminAuditEvent {
  eventId: string;
  disputeId: string;
  tradeId: number;
  adminAddress: string;
  action: AdminDisputeAction;
  reason?: string;
  timestamp: string;
  evidenceReferences?: string[];
}

export interface DisputeRecord {
  disputeId: string;
  tradeId: number;
  buyerAddress: string;
  sellerAddress: string;
  status: 'DISPUTE_OPEN' | 'RESOLUTION_PENDING' | 'CLOSED_BUYER_FAVORED' | 'CLOSED_SELLER_FAVORED';
  openedBy: 'BUYER' | 'SELLER';
  reason: string;
  evidenceHash?: string;
  sellerRemarks?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolutionNotes?: string;
}

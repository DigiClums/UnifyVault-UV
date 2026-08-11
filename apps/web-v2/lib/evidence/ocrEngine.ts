import { ExtractedReceiptData } from './types';

/**
 * Non-custodial OCR data extraction parser engine.
 * EXTRACTS DATA ONLY — MUST NEVER HAVE AUTHORITY TO MOVE FUNDS OR BE TREATED AS AN ORACLE.
 */
export function extractReceiptDataFromText(rawText: string): ExtractedReceiptData {
  if (!rawText || rawText.trim().length === 0) {
    return { confidenceScore: 0.0 };
  }

  const text = rawText.replace(/\r/g, '');

  let amount: number | undefined = undefined;
  let currency: string | undefined = undefined;
  let utr: string | undefined = undefined;
  let transactionDate: string | undefined = undefined;
  let transactionTime: string | undefined = undefined;
  let paymentStatus: string | undefined = undefined;
  let senderName: string | undefined = undefined;
  let receiverName: string | undefined = undefined;

  // 1. Amount Extraction Regex
  // Matches: ₹10,000.00, Rs 10000, $100.00, 1000 USD, Amount: 10000
  const amountRegexes = [
    /(?:Amount|Paid|Total|Value)[:\s]*(?:[₹$€£Rs\.\s])*\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:[₹$€£]|Rs\.?)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /([\d,]+(?:\.\d{1,2})?)\s*(?:USD|EUR|INR|GBP)/i,
  ];

  for (const regex of amountRegexes) {
    const match = text.match(regex);
    if (match && match[1]) {
      const numericStr = match[1].replace(/,/g, '');
      const parsed = parseFloat(numericStr);
      if (!isNaN(parsed) && parsed > 0) {
        amount = parsed;
        break;
      }
    }
  }

  // Currency extraction
  if (/₹|INR|Rs/i.test(text)) currency = 'INR';
  else if (/\$|USD/i.test(text)) currency = 'USD';
  else if (/€|EUR/i.test(text)) currency = 'EUR';
  else if (/£|GBP/i.test(text)) currency = 'GBP';

  // 2. UTR / Payment Reference Extraction Regex
  // Matches: UTR: 123456789012, Ref No: ABC123XYZ, Transaction ID: 987654321
  const utrRegexes = [
    /(?:UTR|RRN|Ref\s*No|Txn\s*ID|Transaction\s*ID)[:\s]*([A-Z0-9]{4,32})/i,
    /\b\d{10,18}\b/, // 10-18 digit reference numbers
  ];

  for (const regex of utrRegexes) {
    const match = text.match(regex);
    if (match && match[1]) {
      utr = match[1].trim().toUpperCase();
      break;
    } else if (match && match[0]) {
      utr = match[0].trim().toUpperCase();
      break;
    }
  }

  // 3. Status Extraction
  if (/Success|Successful|Completed|Paid|Approved/i.test(text)) {
    paymentStatus = 'SUCCESSFUL';
  } else if (/Failed|Declined|Rejected/i.test(text)) {
    paymentStatus = 'FAILED';
  } else if (/Pending|Processing/i.test(text)) {
    paymentStatus = 'PENDING';
  }

  // 4. Date & Time Extraction
  const dateMatch = text.match(
    /\b(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4}|\d{4}[-/\.]\d{1,2}[-/\.]\d{1,2})\b/,
  );
  if (dateMatch) transactionDate = dateMatch[1];

  const timeMatch = text.match(/\b(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)\b/i);
  if (timeMatch) transactionTime = timeMatch[1];

  // 5. Sender & Receiver Extraction
  const senderMatch = text.match(/(?:From|Paid By|Sender)[:\s]*([A-Za-z\s]+)/i);
  if (senderMatch) senderName = senderMatch[1].trim();

  const receiverMatch = text.match(/(?:To|Paid To|Receiver|Beneficiary)[:\s]*([A-Za-z\s]+)/i);
  if (receiverMatch) receiverName = receiverMatch[1].trim();

  // Confidence Score Calculation
  let confidenceScore = 0.2; // Base score for non-empty text
  if (amount !== undefined) confidenceScore += 0.3;
  if (utr !== undefined) confidenceScore += 0.3;
  if (paymentStatus === 'SUCCESSFUL') confidenceScore += 0.1;
  if (transactionDate !== undefined) confidenceScore += 0.1;

  confidenceScore = Math.min(1.0, confidenceScore);

  return {
    amount,
    currency,
    utr,
    transactionDate,
    transactionTime,
    paymentStatus,
    senderName,
    receiverName,
    confidenceScore,
  };
}
